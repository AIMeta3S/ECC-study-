---
description: Open a plan or HTML artifact in the browser Plan Canvas for annotate-and-approve review
argument-hint: "[path/to/artifact.plan.md | path/to/artifact.html]"
---

# Plan Canvas Command

Opens a local artifact in the Plan Canvas — ECC's browser review surface —
where the user annotates elements, chats with you, and approves the plan or
requests changes without leaving the page.

This command is a thin entry point over the `plan-canvas` skill. Follow that
skill for the full workflow and rules.

## What This Command Does

In an aimeta3s flat install there is no `ecc-plan-canvas` bin on PATH, so
resolve the install root first and call `node "$ECC_ROOT/scripts/plan-canvas.js"`:

```bash
ECC_ROOT="${CLAUDE_PLUGIN_ROOT:-$(node -e "var r=(()=>{var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var p=require('path'),f=require('fs'),h=require('os').homedir(),d=p.join(h,'.claude'),q=p.join('scripts','lib','utils.js');if(f.existsSync(p.join(d,q)))return d;for(var s of [['ecc'],['ecc@ecc'],['marketplaces','ecc'],['everything-claude-code'],['everything-claude-code@everything-claude-code'],['marketplaces','everything-claude-code']]){var l=p.join(d,'plugins',...s);if(f.existsSync(p.join(l,q)))return l}try{for(var g of ['ecc','everything-claude-code']){var b=p.join(d,'plugins','cache',g);for(var o of f.readdirSync(b,{withFileTypes:true})){if(!o.isDirectory())continue;for(var v of f.readdirSync(p.join(b,o.name),{withFileTypes:true})){if(!v.isDirectory())continue;var c=p.join(b,o.name,v.name);if(f.existsSync(p.join(c,q)))return c}}}}catch(x){}return d})();console.log(r)")}"
```

1. Resolve the artifact: the given path, else the most recently modified
   `.claude/plans/*.plan.md`, else ask what to review.
2. `node "$ECC_ROOT/scripts/plan-canvas.js" open <artifact>` — opens the user's browser.
3. `node "$ECC_ROOT/scripts/plan-canvas.js" await <artifact>` — block until feedback,
   verdict, or session end; leave it running.
4. Apply feedback to the artifact file (the canvas live-reloads), answer with
   `node "$ECC_ROOT/scripts/plan-canvas.js" await <artifact> --reply "..."`, and repeat
   until the user approves or ends the session.

An `approve` verdict counts as plan confirmation for `/plan`-style gates:
stop polling, `end` the session, and begin implementation.

## Example

```
User: /plan-canvas .claude/plans/notifications.plan.md

Assistant: (runs open + await, browser opens)
...user clicks "Request changes" with two annotations...
Assistant: (edits the plan, replies in-canvas, awaits again)
...user clicks "Approve plan"...
Assistant: Plan approved in the canvas — starting implementation.
```

## Related

- `plan-canvas` skill — full workflow, feedback JSON shapes, rules
- `/plan` — produces the plan artifacts this reviews
- Source: `scripts/plan-canvas.js`, `scripts/lib/plan-canvas/`
