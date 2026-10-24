import test from "node:test";
import assert from "node:assert/strict";
import {measureMediaDemandConservation} from "../src/media-demand-conservation.mjs";
const needs=[{id:"need-1",artifacts:[{purpose:"hero",wanted:1},{purpose:"alt",wanted:2}]}];
const alloc=(allocation,state,purpose="hero",count=1)=>({
  allocation,mediaNeed:"need-1",purpose,count,state
});
test("two competing provider holds on one image are visible as overbooking",()=>{
  const measured=measureMediaDemandConservation({needs,allocations:[
    alloc("provider-A","held"),alloc("provider-B","generated")
  ]});
  assert.equal(measured.conserved,false);
  assert.equal(measured.oversubscribed.length,1);
  assert.equal(measured.oversubscribed[0].overbooked,1);
  assert.equal(measured.oversubscribed[0].remaining,0);
  assert.equal(measured.oversubscribed[0].reserved,2);
});
test("a released losing bid returns work; public use consumes exactly one unit",()=>{
  const first=measureMediaDemandConservation({needs,allocations:[
    alloc("provider-A","released"),alloc("provider-B","generated")
  ]});
  assert.equal(first.conserved,true);
  assert.equal(first.items.find(x=>x.purpose==="hero").remaining,0);
  assert.equal(first.items.find(x=>x.purpose==="hero").reserved,1);
  const settled=measureMediaDemandConservation({needs,allocations:[
    alloc("provider-A","refused"),alloc("provider-B","public-use")
  ]});
  assert.equal(settled.conserved,true);
  assert.equal(settled.items.find(x=>x.purpose==="hero").fulfilled,1);
});
test("unrecognized work, unknown states and duplicate allocation identities remain explicit defects",()=>{
  const x=measureMediaDemandConservation({needs,allocations:[
    alloc("orphan","held","not-an-actual-purpose"),alloc("invalid","declared-success")
  ]});
  assert.equal(x.conserved,false);
  assert.equal(x.orphanAllocations.length,1);
  assert.equal(x.invalidAllocationStates.length,1);
  assert.throws(()=>measureMediaDemandConservation({needs,allocations:[
    alloc("id","held"),alloc("id","generated")
  ]}),/duplicate latest allocation/u);
});
test("no provider can conjure initial demand or negative quantities",()=>{
  assert.throws(()=>measureMediaDemandConservation({needs:[{id:"x",artifacts:[{purpose:"y",wanted:-1}]}],allocations:[]}),/nonnegative/u);
  const x=measureMediaDemandConservation({needs:[],allocations:[alloc("unknown","held")]});
  assert.equal(x.conserved,false);
  assert.equal(x.orphanAllocations.length,1);
});
