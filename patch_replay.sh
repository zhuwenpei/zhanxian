sed -i 's/const \[isPlaying, setIsPlaying\] = useState(false);/const [isPlaying, setIsPlaying] = useState(false);\n  const [playbackSpeed, setPlaybackSpeed] = useState(1);/g' src/components/ReplayControls.tsx
sed -i 's/}, 400);/}, 400 \/ playbackSpeed);/g' src/components/ReplayControls.tsx
