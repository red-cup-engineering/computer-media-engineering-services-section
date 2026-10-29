import { defineCapability } from "@red-cup-engineering/feltos/capabilities";
import { joinGuild } from "@red-cup-engineering/feltos/social";
import { placeOf, value } from "@red-cup-engineering/feltos/world";

const MARINERS_GUILD = "farstone-mariners-guild";

function join(ctx) {
  if (placeOf(ctx.world, ctx.actor) !== "the-net-loft") return { events: [ctx.message(ctx.actor, "The Mariners' Guild receives hands at the Net Loft.")] };
  if (!/^(mariners?|mariners?\s+guild)$/u.test(ctx.argument.trim().toLowerCase())) {
    return { events: [ctx.message(ctx.actor, "Join the Mariners' Guild.")] };
  }
  try {
    const world = joinGuild(ctx.world, ctx.actor, MARINERS_GUILD);
    return { world, events: [ctx.message(ctx.actor, "Guild-Master Orla enters your name among the working mariners.")] };
  } catch (error) {
    return { events: [ctx.message(ctx.actor, error instanceof Error ? error.message : "The guild cannot receive you.")] };
  }
}

function guilds(ctx) {
  const member = value(ctx.world, ctx.actor, "guild") === MARINERS_GUILD ? " You are entered among its hands." : "";
  return { events: [ctx.message(ctx.actor, `Guilds: the Mariners' Guild (Net Loft; Guild-Master Orla).${member}`)] };
}

function title(ctx) {
  const stage = Number(value(ctx.world, ctx.actor, "campaign-stage") ?? 0);
  const calling = stage >= 6 ? "Farston hand" : stage >= 3 ? "harbor hand" : "newcomer";
  return { events: [ctx.message(ctx.actor, `Your calling is ${calling}; it changes with the work you have actually completed.`)] };
}

export const farstoneSocialCapability = defineCapability({
  id: "farstone.social",
  commands: { join, guilds, title },
});

export { MARINERS_GUILD };
