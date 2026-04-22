import json
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, Rectangle

plt.rcParams["font.sans-serif"] = [
    "PingFang SC",
    "Heiti TC",
    "Arial Unicode MS",
    "DejaVu Sans",
]
plt.rcParams["axes.unicode_minus"] = False

ROOT = Path(__file__).resolve().parent
IMAGES = ROOT / "images"
IMAGES.mkdir(parents=True, exist_ok=True)

benchmark = json.loads((ROOT / "benchmark-summary.json").read_text(encoding="utf-8"))
terminal_summary = json.loads((ROOT / "terminal-chain-summary.json").read_text(encoding="utf-8"))


def save_fig(fig, name: str) -> None:
    fig.savefig(IMAGES / f"{name}.png", dpi=300, bbox_inches="tight")
    plt.close(fig)


# 1) Route accuracy bar chart
fig, ax = plt.subplots(figsize=(8, 4.8))
route_vals = [
    benchmark["routeAccuracy"]["full"]["accuracy"],
    benchmark["routeAccuracy"]["ablationNoContextInjection"]["accuracy"],
]
labels = ["Full", "Ablation"]
colors = ["#2563eb", "#f59e0b"]
bars = ax.bar(labels, route_vals, color=colors, width=0.55)
ax.set_ylim(0, 1.05)
ax.set_ylabel("Accuracy")
ax.set_title("Route Accuracy Comparison")
for bar, v in zip(bars, route_vals):
    ax.text(bar.get_x() + bar.get_width() / 2, v + 0.02, f"{v:.4f}", ha="center", va="bottom", fontsize=10)
ax.grid(axis="y", linestyle="--", alpha=0.35)
save_fig(fig, "fig5-1-route-accuracy")


# 2) Ticket success chart
fig, ax = plt.subplots(figsize=(8, 4.8))
ticket_vals = [
    benchmark["ticketExecution"]["bash"]["successRate"],
    benchmark["ticketExecution"]["native"]["successRate"],
]
labels = ["Bash", "Native"]
bars = ax.bar(labels, ticket_vals, color=["#10b981", "#7c3aed"], width=0.55)
ax.set_ylim(0, 1.05)
ax.set_ylabel("Success Rate")
ax.set_title("Ticket Tool Success Rate")
for bar, v in zip(bars, ticket_vals):
    ax.text(bar.get_x() + bar.get_width() / 2, v + 0.02, f"{v:.2f}", ha="center", va="bottom", fontsize=10)
ax.grid(axis="y", linestyle="--", alpha=0.35)
save_fig(fig, "fig5-2-ticket-success")


# 3) Memory window quality chart
fig, ax = plt.subplots(figsize=(8.4, 5.0))
window_labels = ["window0", "window2", "window8"]
window_vals = [
    benchmark["memoryWindowImpact"]["window0"]["qualityScore"],
    benchmark["memoryWindowImpact"]["window2"]["qualityScore"],
    benchmark["memoryWindowImpact"]["window8"]["qualityScore"],
]
ax.bar(window_labels, window_vals, color=["#94a3b8", "#38bdf8", "#2563eb"], width=0.55, alpha=0.85)
ax.plot(window_labels, window_vals, color="#0f172a", marker="o", linewidth=2)
ax.set_ylim(0, 1.05)
ax.set_ylabel("Quality Score")
ax.set_title("Memory Window Impact")
for x, y in zip(window_labels, window_vals):
    ax.text(x, y + 0.02, f"{y:.2f}", ha="center", va="bottom", fontsize=10)
ax.grid(axis="y", linestyle="--", alpha=0.35)
save_fig(fig, "fig5-3-memory-window")


# 4) Architecture diagram (box + arrow)
fig, ax = plt.subplots(figsize=(14, 8))
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis("off")

boxes = {
    "User": (3, 76, 14, 10),
    "Message Factory": (20, 76, 18, 10),
    "SessionStore": (42, 76, 14, 10),
    "Gateway": (60, 76, 14, 10),
    "Orchestrator": (78, 76, 18, 10),
    "ServiceAgent": (78, 58, 18, 10),
    "KnowledgeAgent": (52, 40, 16, 10),
    "TicketsAgent(ReAct)": (72, 40, 22, 10),
    "HandoffAgent": (26, 40, 16, 10),
    "TicketTools": (72, 22, 18, 10),
    "HandoffTools": (26, 22, 16, 10),
    "Reply+Trace": (52, 22, 16, 10),
    "State Writeback": (52, 6, 20, 10),
}

for name, (x, y, w, h) in boxes.items():
    rect = Rectangle((x, y), w, h, linewidth=1.5, edgecolor="#1f2937", facecolor="#eff6ff")
    ax.add_patch(rect)
    ax.text(x + w / 2, y + h / 2, name, ha="center", va="center", fontsize=9)


def arrow(p1, p2):
    ax.add_patch(FancyArrowPatch(p1, p2, arrowstyle="->", mutation_scale=12, linewidth=1.3, color="#374151"))

arrow((17, 81), (20, 81))
arrow((38, 81), (42, 81))
arrow((56, 81), (60, 81))
arrow((74, 81), (78, 81))
arrow((87, 76), (87, 68))
arrow((87, 58), (60, 50))
arrow((87, 58), (83, 50))
arrow((87, 58), (34, 50))
arrow((83, 40), (81, 32))
arrow((34, 40), (34, 32))
arrow((60, 40), (60, 32))
arrow((34, 22), (52, 27))
arrow((81, 22), (68, 27))
arrow((60, 22), (62, 16))
arrow((52, 11), (49, 81))

ax.set_title("System Architecture (for Thesis Chapter 3)", fontsize=14, pad=14)
save_fig(fig, "fig3-1-system-architecture")


# 5) Sequence diagram (lifeline style)
fig, ax = plt.subplots(figsize=(14, 8))
ax.set_xlim(0, 110)
ax.set_ylim(0, 110)
ax.axis("off")

actors = [
    "User",
    "Runtime",
    "SessionStore",
    "Gateway",
    "Orchestrator",
    "ServiceAgent",
    "DownstreamAgent",
    "Tool",
]
xs = [8, 22, 36, 50, 64, 78, 92, 104]

for x, actor in zip(xs, actors):
    ax.text(x, 103, actor, ha="center", va="center", fontsize=9, fontweight="bold")
    ax.plot([x, x], [10, 98], linestyle="--", linewidth=1, color="#9ca3af")


def msg(x1, x2, y, label):
    ax.add_patch(FancyArrowPatch((x1, y), (x2, y), arrowstyle="->", mutation_scale=10, linewidth=1.3, color="#111827"))
    ax.text((x1 + x2) / 2, y + 2, label, ha="center", va="bottom", fontsize=8)

msg(8, 22, 92, "business message")
msg(22, 36, 84, "recordBusinessMessage")
msg(22, 50, 76, "handle(snapshot)")
msg(50, 64, 68, "route + role inputs")
msg(64, 78, 60, "route decision")
msg(78, 64, 52, "route,intent,confidence")
msg(64, 92, 44, "run downstream agent")
msg(92, 104, 36, "tool action")
msg(104, 92, 28, "tool result")
msg(92, 64, 20, "final plan/reply")
msg(64, 50, 16, "downstream result")
msg(50, 36, 14, "append reply / update state")
msg(22, 8, 12, "final reply + trace")

ax.set_title("End-to-End Execution Sequence (for Thesis Chapter 4)", fontsize=14, pad=14)
save_fig(fig, "fig4-1-execution-sequence")


# 6) Optional table image: terminal 4-turn summary
turns = terminal_summary.get("turns", [])
fig, ax = plt.subplots(figsize=(12, 3.8))
ax.axis("off")
columns = ["Turn", "Message", "Route", "Action", "TicketId", "QueueId"]
rows = []
for t in turns:
    rows.append([
        t.get("turn"),
        (t.get("message") or "")[:18] + ("..." if len(t.get("message") or "") > 18 else ""),
        t.get("route") or "",
        t.get("ticketAction") or "-",
        t.get("ticketId") or "-",
        t.get("handoffQueueId") or "-",
    ])

table = ax.table(cellText=rows, colLabels=columns, loc="center", cellLoc="center")
table.auto_set_font_size(False)
table.set_fontsize(8)
table.scale(1, 1.5)
ax.set_title("Terminal Chain 4-Turn Summary", fontsize=12, pad=10)
save_fig(fig, "fig5-4-terminal-chain-summary")

print("Generated PNG files in:", IMAGES)
for p in sorted(IMAGES.glob("*.png")):
    print(p.name)
