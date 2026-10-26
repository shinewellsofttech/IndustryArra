import PinnedShortcutsWidget from "./widgets/shortcuts/PinnedShortcutsWidget";
import MachineStatusKpi from "./widgets/kpis/MachineStatusKpi";
import DelayCounterKpi from "./widgets/kpis/DelayCounterKpi";
import ActiveJobCardsKpi from "./widgets/kpis/ActiveJobCardsKpi";
import DelayDoughnutWidget from "./widgets/charts/DelayDoughnutWidget";
import PausedMachinesTableWidget from "./widgets/tables/PausedMachinesTableWidget";

export const WIDGET_REGISTRY = {
  SHORTCUT_BAR: {
    id: "SHORTCUT_BAR",
    title: "Pinned Shortcuts Bar",
    category: "Navigation",
    description: "Quick access clickable tiles for favorite forms, masters, and reports",
    defaultSize: { w: 12, h: 2, minW: 12, minH: 2 },
    isStatic: true,
    component: PinnedShortcutsWidget
  },
  KPI_MACHINES: {
    id: "KPI_MACHINES",
    title: "Fleet Machine Status",
    category: "KPI Metrics",
    description: "Total, running, paused, and idle machine count indicators",
    defaultSize: { w: 4, h: 3, minW: 3, minH: 3 },
    component: MachineStatusKpi
  },
  KPI_DELAYS: {
    id: "KPI_DELAYS",
    title: "Delay & Lost Time Metrics",
    category: "KPI Metrics",
    description: "Delayed transitions count and total lost production hours",
    defaultSize: { w: 4, h: 3, minW: 3, minH: 3 },
    component: DelayCounterKpi
  },
  KPI_JOBCARDS: {
    id: "KPI_JOBCARDS",
    title: "Job Card Operations Counter",
    category: "KPI Metrics",
    description: "Job cards actively running on the production floor",
    defaultSize: { w: 4, h: 3, minW: 3, minH: 3 },
    component: ActiveJobCardsKpi
  },
  CHART_DELAY_DOUGHNUT: {
    id: "CHART_DELAY_DOUGHNUT",
    title: "Machine Fleet Distribution Chart",
    category: "Analytics & Charts",
    description: "Doughnut chart of active running vs paused vs idle machines",
    defaultSize: { w: 6, h: 6, minW: 4, minH: 4 },
    component: DelayDoughnutWidget
  },
  TABLE_PAUSED_MACHINES: {
    id: "TABLE_PAUSED_MACHINES",
    title: "Paused / On-Hold Machines Table",
    category: "Live Operations",
    description: "Live table of paused machines with direct 1-click resume action",
    defaultSize: { w: 6, h: 6, minW: 6, minH: 4 },
    component: PausedMachinesTableWidget
  }
};
