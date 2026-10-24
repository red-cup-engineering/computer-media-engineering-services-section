import test from "node:test";
import assert from "node:assert/strict";
import {projectMediaBidOpportunities} from "../src/media-provider-opportunities.mjs";
const inbox=()=>({
  needs:[
    {id:"n1",consumer:"science",source:{ref:"s1"},objective:"show a result",artifacts:[{purpose:"figure",capability:"image-generation",destination:"science.pdf",wanted:1}]},
    {id:"n2",consumer:"public",source:{ref:"s2"},objective:"public summary",artifacts:[{purpose:"social",capability:"image-generation",wanted:1}]},
    {id:"n3",consumer:"science",intake:{state:"proposed-unverified"},artifacts:[{purpose:"proposal",capability:"image-generation",wanted:1}]}
  ],
  frontier:[
    {need:"n1",consumer:"science",purpose:"figure",capability:"image-generation",priority:42,state:"admissible",wanted:1},
    {need:"n2",consumer:"public",purpose:"social",capability:"image-generation",priority:999,state:"admissible",wanted:1},
    {need:"n3",consumer:"science",purpose:"proposal",capability:"image-generation",priority:9999,state:"admissible",wanted:1}
  ],allocations:[]
});
test("provider sees only consented consumers and real unreserved approved work",()=>{
 const p=projectMediaBidOpportunities({inbox:inbox(),consumers:["science"],capabilities:["image-generation"]});
 assert.equal(p.opportunities.length,1);
 assert.equal(p.opportunities[0].mediaNeed,"n1");
 assert.equal(p.opportunities[0].state,"OPEN_TO_PROVIDER_OFFERS_NOT_AWARDED");
});
test("other suppliers are visible; view cannot award or reserve anything",()=>{
 const i=inbox(),bids=[{mediaNeed:"n1",purpose:"figure",provider:"provider-B"},{mediaNeed:"n1",purpose:"figure",provider:"provider-A"}];
 const p=projectMediaBidOpportunities({inbox:i,bids,consumers:["science"],capabilities:["image-generation"]});
 assert.deepEqual(p.opportunities[0].existingProviders,["provider-A","provider-B"]);
 assert.equal(p.opportunities[0].observedBidCount,2);
 assert.equal(i.allocations.length,0);
});
test("no accidental all-principal disclosure or imagined empty journal",()=>{
 assert.throws(()=>projectMediaBidOpportunities({inbox:inbox(),consumers:[],capabilities:["image-generation"]}),/nonempty explicit array/u);
 assert.throws(()=>projectMediaBidOpportunities({inbox:null,consumers:["science"],capabilities:["image-generation"]}),/observation required/u);
});
