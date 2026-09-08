export const manifest = {
  screens: {
    scr_jvzjbg: { name: "Capability Register", route: "/", position: { "x": 160, "y": 220 } },
    scr_mo6c6o: { name: "Capability Dashboard", route: "/capabilities/CAP-0015", position: { "x": 1560, "y": 4180 } },
    scr_zm1ixt: { name: "Hardware Capability", route: "/capabilities/CAP-0001", position: { "x": 160, "y": 4180 } },
    scr_kxouk3: { name: "Manage Epics", route: "/capabilities/CAP-0015/epics", position: { "x": 160, "y": 6160 } },
    scr_bdunh4: { name: "Manage Features", route: "/capabilities/CAP-0015/epics/EPIC-001/features", position: { "x": 1560, "y": 6160 } },
    scr_3vjyjc: { name: "Manage User Stories", route: "/capabilities/CAP-0015/epics/EPIC-001/features/FEAT-001/stories", position: { "x": 2960, "y": 6160 } },
    scr_li958e: { name: "Capability Groups", route: "/groups", position: { "x": 160, "y": 2200 } },
    scr_tsofxm: { name: "Domains", route: "/domains", position: { "x": 1560, "y": 2200 } },
    scr_1jfzus: { name: "Equipment", route: "/equipment", position: { "x": 2960, "y": 2200 } },
    scr_u182jc: { name: "Waves", route: "/waves", position: { "x": 4360, "y": 2200 } }
  },
  sections: {
    sec_8z8h8j: { name: "Landing", x: 0, y: 0, width: 1520, height: 1180 },
    sec_7a6w4u: { name: "Top-level Navigation", x: 0, y: 1980, width: 5720, height: 1180 },
    sec_wrolc7: { name: "Capability Details", x: 0, y: 3960, width: 2920, height: 1180 },
    sec_vc7jaf: { name: "Capability Decomposition Flow", x: 0, y: 5940, width: 4320, height: 1180 }
  },
  layers: [
  { kind: "section", id: "sec_8z8h8j", children: [
    { kind: "screen", id: "scr_jvzjbg" }]
  },
  { kind: "section", id: "sec_7a6w4u", children: [
    { kind: "screen", id: "scr_li958e" },
    { kind: "screen", id: "scr_tsofxm" },
    { kind: "screen", id: "scr_1jfzus" },
    { kind: "screen", id: "scr_u182jc" }]
  },
  { kind: "section", id: "sec_wrolc7", children: [
    { kind: "screen", id: "scr_zm1ixt" },
    { kind: "screen", id: "scr_mo6c6o" }]
  },
  { kind: "section", id: "sec_vc7jaf", children: [
    { kind: "screen", id: "scr_kxouk3" },
    { kind: "screen", id: "scr_bdunh4" },
    { kind: "screen", id: "scr_3vjyjc" }]
  }]

};