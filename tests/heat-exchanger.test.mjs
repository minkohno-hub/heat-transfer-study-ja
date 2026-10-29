import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXCHANGER_DEFAULTS, exchangerFields, exchangerFieldNames,
  calculateExchanger, exchangerEffectiveness, logMeanDifference,
  renderExchangerFields, renderExchangerSteps, renderExchangerDiagram,
  exchangerEffectivenessGraph
} from '../heat-exchanger.mjs';

const calc = patch => calculateExchanger({...EXCHANGER_DEFAULTS, ...patch});
const close = (a,b,rel=1e-9) => assert.ok(
  Math.abs(a-b)<=rel*Math.max(1,Math.abs(a),Math.abs(b)),
  String(a)+' versus '+String(b)
);

test('counterflow default: known balanced endpoint example and LMTD limit', () => {
  const x=calc({});
  assert.equal(x.error,undefined);
  close(x.hotCapacity,400); close(x.coldCapacity,400);
  close(x.ntu,.5); close(x.cr,1);
  close(x.effectiveness,1/3);
  close(x.watts,8000);
  close(x.hotOut,60); close(x.coldOut,40);
  close(x.terminal1,40); close(x.terminal2,40);
  close(x.logMean,40); close(x.ua*x.logMean,8000);
  close(x.hotBalance,x.coldBalance);
});

test('unequal capacity rates satisfy energy balance and independent LMTD', () => {
  const x=calc({hotIn:100,coldIn:20,coldMass:.2});
  const cr=x.cr,ntu=x.ntu;
  const expected=(-Math.expm1(-ntu*(1-cr)))/(1-cr*Math.exp(-ntu*(1-cr)));
  close(x.effectiveness,expected);
  close(x.watts,x.hotBalance);
  close(x.watts,x.coldBalance);
  close(x.watts,x.ua*x.logMean);
  close(x.logMean,logMeanDifference(x.terminal1,x.terminal2));
  assert.ok(x.hotOut<x.values.hotIn);
  assert.ok(x.coldOut>x.values.coldIn);
});

test('counterflow outperforms parallel flow at the same conductance and positive inlet difference', () => {
  const counter=calc({coldMass:.2});
  const parallel=calc({coldMass:.2,flow:'parallel'});
  assert.ok(counter.watts>parallel.watts);
  assert.ok(counter.effectiveness>parallel.effectiveness);
  close(parallel.effectiveness,-Math.expm1(-parallel.ntu*(1+parallel.cr))/(1+parallel.cr));
  close(parallel.watts,parallel.ua*parallel.logMean);
  close(parallel.hotBalance,parallel.coldBalance);
});

test('exact and near-equal heat capacity rates remain numerically stable', () => {
  for(const coldMass of [.4,.4*(1+1e-12),.4*(1+1e-8)]){
    const x=calc({coldMass,hotIn:90});
    assert.ok(Number.isFinite(x.effectiveness));
    assert.ok(Number.isFinite(x.logMean));
    close(x.watts,x.ua*x.logMean,1e-7);
    assert.ok(x.effectiveness>0&&x.effectiveness<=1);
  }
  close(exchangerEffectiveness('counter',1,1),.5);
  close(exchangerEffectiveness('parallel',1,1),-Math.expm1(-2)/2);
});

test('small and large NTU limiting behavior remains finite', () => {
  const low=calc({u:.01,area:.0001});
  assert.ok(low.ntu<1e-7);
  close(low.effectiveness,low.ntu,1e-7);
  close(low.watts,low.ua*low.logMean,1e-6);
  const high=calc({u:100000,area:1000,hotMass:.0001,hotCp:10});
  assert.ok(high.ntu>1e9);
  assert.ok(Number.isFinite(high.logMean));
  assert.ok(high.logMean>0);
  close(high.watts,high.ua*high.logMean,1e-7);
  assert.ok(high.effectiveness>0&&high.effectiveness<=1);
  const chart=exchangerEffectivenessGraph(high);
  assert.match(chart,/表示上限/);
  assert.ok(!chart.includes('NaN')&&!chart.includes('Infinity'));
});

test('inverted gradient reverses the heat flow, equal inlets give zero watts', () => {
  for(const flow of ['counter','parallel']){
    const x=calc({flow,hotIn:10,coldIn:80});
    assert.ok(x.watts<0);
    close(x.watts,x.hotBalance);
    close(x.watts,x.coldBalance);
    close(x.watts,x.ua*x.logMean);
    assert.ok(x.logMean<0);
    const zero=calc({flow,hotIn:20,coldIn:20});
    close(zero.watts,0);close(zero.logMean,0);
    close(zero.hotOut,20);close(zero.coldOut,20);
  }
});

test('effectiveness is bounded and monotonic in NTU for both flow patterns', () => {
  for(const flow of ['counter','parallel']){
    for(const cr of [0,.05,.5,.99,.999999999999,1]){
      let previous=0;
      for(const ntu of [1e-9,.01,.1,.5,1,3,10,100,1e8]){
        const e=exchangerEffectiveness(flow,ntu,cr);
        assert.ok(Number.isFinite(e)&&e>0&&e<=1,'invalid effectiveness');
        assert.ok(e>=previous,'not monotonic with NTU');
        previous=e;
      }
    }
  }
});

test('invalid and unsafe inputs are rejected', () => {
  for(const patch of [
    {hotMass:''},{coldMass:0},{hotCp:Infinity},{coldCp:'NaN'},
    {area:0},{u:-1},{hotIn:-273.15},{coldIn:3001},
    {flow:'cross'},{hotMass:'0x10'},{coldMass:null},
    {hotCp:[]},{u:'1e9999'}
  ]) assert.ok(calc(patch).error,'accepted invalid input: '+JSON.stringify(patch));
  assert.ok(calculateExchanger(null).error);
  assert.ok(calculateExchanger([]).error);
  assert.ok(Number.isNaN(logMeanDifference(0,1)));
  assert.ok(Number.isNaN(logMeanDifference(5,-2)));
});

test('separate UI functions escape user input and provide accessible diagrams', () => {
  assert.equal(exchangerFieldNames.length,8);
  assert.equal(exchangerFields.length,8);
  const form=renderExchangerFields({...EXCHANGER_DEFAULTS,hotMass:'"><img onerror=alert(1)>'});
  assert.ok(!form.includes('<img'));
  assert.match(form,/&quot;&gt;&lt;img/);
  const x=calc({});
  assert.match(renderExchangerSteps(x),/NTU/);
  assert.match(renderExchangerSteps(x),/LMTD/);
  assert.match(renderExchangerSteps(x),/W\/K/);
  assert.match(renderExchangerDiagram(x),/role="img"/);
  assert.match(exchangerEffectivenessGraph(x),/有効度 ε/);
  assert.match(exchangerEffectivenessGraph(x,x),/chart-baseline/);
  assert.equal(renderExchangerSteps({error:'invalid'}),'');
  assert.equal(exchangerEffectivenessGraph({error:'invalid'}),'');
});
