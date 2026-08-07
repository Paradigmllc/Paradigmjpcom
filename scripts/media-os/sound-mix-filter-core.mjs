function db(value) {
  return Number(value).toFixed(2);
}

function milliseconds(seconds) {
  return Math.max(0, Math.round(seconds * 1000));
}

export function buildSoundMixGraph(manifest, durationSeconds) {
  const beds = manifest.tracks.filter((track) => track.kind === "ambience" || track.kind === "music");
  const filters = [];
  const narrationGain = db(manifest.mix.narrationGainDb);
  if (beds.length > 0) {
    const outputs = ["voice", ...beds.map((_, index) => `sidechain${index}`)].map((label) => `[${label}]`).join("");
    filters.push(`[0:a:0]volume=${narrationGain}dB,asplit=${beds.length + 1}${outputs}`);
  } else {
    filters.push(`[0:a:0]volume=${narrationGain}dB[voice]`);
  }
  const mixInputs = ["[voice]"];
  manifest.tracks.forEach((track, index) => {
    const input = index + 1;
    const base = `stem${index}`;
    const delayed = `placed${index}`;
    filters.push(`[${input}:a:0]atrim=duration=${track.durationSeconds.toFixed(3)},asetpts=PTS-STARTPTS,volume=${db(track.gainDb)}dB[${base}]`);
    if (track.kind === "ambience" || track.kind === "music") {
      const ducked = `ducked${index}`;
      const duck = manifest.mix.ducking;
      filters.push(`[${base}][sidechain${beds.indexOf(track)}]sidechaincompress=threshold=${duck.threshold}:ratio=${duck.ratio}:attack=${duck.attackMs}:release=${duck.releaseMs}[${ducked}]`);
      filters.push(`[${ducked}]adelay=${milliseconds(track.startSeconds)}|${milliseconds(track.startSeconds)}[${delayed}]`);
    } else {
      filters.push(`[${base}]adelay=${milliseconds(track.startSeconds)}|${milliseconds(track.startSeconds)}[${delayed}]`);
    }
    mixInputs.push(`[${delayed}]`);
  });
  filters.push(`${mixInputs.join("")}amix=inputs=${mixInputs.length}:duration=longest:dropout_transition=0,atrim=duration=${durationSeconds.toFixed(3)},alimiter=limit=0.95[mix]`);
  return filters.join(";");
}

export function buildStemInputArgs(manifest) {
  return manifest.tracks.flatMap((track) => track.loop ? ["-stream_loop", "-1", "-i", track.sourcePath] : ["-i", track.sourcePath]);
}
