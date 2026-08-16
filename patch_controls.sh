sed -i 's/import React from/import React, { useState } from/g' src/components/SimulationControls.tsx
sed -i 's/import { Play, Pause/import { Play, Pause, ChevronDown, ChevronUp/g' src/components/SimulationControls.tsx
sed -i 's/export default function SimulationControls() {/export default function SimulationControls() {\n  const [collapsed, setCollapsed] = useState(false);/g' src/components/SimulationControls.tsx
