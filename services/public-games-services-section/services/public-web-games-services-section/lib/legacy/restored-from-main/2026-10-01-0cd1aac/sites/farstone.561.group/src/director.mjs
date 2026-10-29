import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { settleOffSeason } from "./campaign.mjs";

export const farstoneDirectorCapability = defineCapability({
  id: "farstone.director",
  onTick(ctx) {
    let world = ctx.world;
    for (const actor of ctx.actors) {
      world = settleOffSeason(world, actor).world;
    }

    return { world };
  },
});
