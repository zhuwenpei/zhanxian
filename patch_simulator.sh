sed -i -e '/const blueHQ = getClosest(blueCenter, blueCellsList);/a\
\
  if (!hasAdjacency) {\
    const beachheadSize = Math.max(3, Math.floor(blueCellsList.length * 0.01));\
    const sortedBlue = [...blueCellsList].filter(c => cells[c]).sort((a, b) => {\
      const [latA, lngA] = cellToLatLng(a);\
      const [latB, lngB] = cellToLatLng(b);\
      return ((lngA - redCenter[0])**2 + (latA - redCenter[1])**2) - ((lngB - redCenter[0])**2 + (latB - redCenter[1])**2);\
    });\
    const sortedRed = [...redCellsList].filter(c => cells[c]).sort((a, b) => {\
      const [latA, lngA] = cellToLatLng(a);\
      const [latB, lngB] = cellToLatLng(b);\
      return ((lngA - blueCenter[0])**2 + (latA - blueCenter[1])**2) - ((lngB - blueCenter[0])**2 + (latB - blueCenter[1])**2);\
    });\
    for (let i = 0; i < beachheadSize && i < sortedBlue.length; i++) {\
      if (sortedBlue[i] !== blueHQ) cells[sortedBlue[i]].owner = "red";\
    }\
    const redBeachheadSize = Math.max(3, Math.floor(redCellsList.length * 0.01));\
    for (let i = 0; i < redBeachheadSize && i < sortedRed.length; i++) {\
      if (sortedRed[i] !== redHQ) cells[sortedRed[i]].owner = "blue";\
    }\
  }' src/engine/simulator.ts
