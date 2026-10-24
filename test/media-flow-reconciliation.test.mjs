import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reconcileFlowMediaAllocations } from "../src/media-flow-reconciliation.mjs";
import { readMediaAllocationStates, recordMediaAllocationState } from "../src/media-demand-journal.mjs";

test("Flow reconciliation advances shared allocation custody from held through public use",t=>{
  const root=mkdtempSync(join(tmpdir(),"flow-reconcile-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const common={root,allocation:"alloc-1",mediaNeed:"need-1",purpose:"social-outbound",count:1,provider:"urn:ame:google-flow"};
  recordMediaAllocationState({...common,state:"held",at:"2026-10-04T18:00:00.000Z",receipt:"queue-1"});
  let inventory={
    counts:{pending:0,generated:1,delivered:0,publicUse:0,undelivered:1},
    artifacts:[{allocation:"alloc-1",mediaNeed:"need-1",purpose:"social-outbound",completionId:"completion-1",generatedAt:"2026-10-04T18:10:00.000Z",custody:"generated"}],
  };
  let result=reconcileFlowMediaAllocations({root,flow:{flowMediaInventory:()=>inventory},now:new Date("2026-10-04T18:20:00Z")});
  assert.equal(result.transitions[0].state,"generated");
  assert.equal(readMediaAllocationStates({root})[0].state,"generated");

  inventory={
    counts:{pending:0,generated:1,delivered:0,publicUse:1,undelivered:0},
    artifacts:[{
      allocation:"alloc-1",mediaNeed:"need-1",purpose:"social-outbound",completionId:"completion-1",generatedAt:"2026-10-04T18:10:00.000Z",
      custody:"public-use",delivery:{id:"delivery-1",stage:"public-use",recordedAt:"2026-10-04T18:30:00.000Z",publicAddress:"https://bsky.app/profile/koiosnews.bsky.social/post/abc"},
    }],
  };
  result=reconcileFlowMediaAllocations({root,flow:{flowMediaInventory:()=>inventory},now:new Date("2026-10-04T18:40:00Z")});
  assert.deepEqual(result.transitions.map((row)=>row.state),["delivered","public-use"]);
  assert.equal(readMediaAllocationStates({root})[0].state,"public-use");
});

test("Flow reconciliation fails closed before the custody upgrade exists",t=>{
  const root=mkdtempSync(join(tmpdir(),"flow-reconcile-"));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const result=reconcileFlowMediaAllocations({root,flow:{}});
  assert.equal(result.status,"blocked");
  assert.equal(result.reason,"google-flow-custody-upgrade-not-released");
});
