// Sentinel-1 Radar Vegetation Index (RVI4S1)
// Good for monitoring crop growth structure through clouds
export const RVI_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: ["VV", "VH"],
    output: { bands: 1 }
  };
}

function evaluatePixel(sample) {
  // Convert dB to linear power if input is in dB (usually Sentinel Hub provides linear or dB depending on config)
  // Assuming linear input for standard GRD evalscripts or converting if needed.
  // Standard Sentinel Hub S1-GRD units are linear (DN).
  
  const vv = sample.VV;
  const vh = sample.VH;
  
  if (vv <= 0 || vh <= 0) return [0];

  // RVI = (4 * VH) / (VV + VH)
  const rvi = (4 * vh) / (vv + vh);
  
  return [rvi];
}
`;

// Sentinel-1 Surface Soil Moisture (SSM) Proxy
// Simple empirical model using VV/VH ratio
export const SSM_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: ["VV", "VH", "dataMask"],
    output: { bands: 3 }
  };
}

function evaluatePixel(sample) {
  if (sample.dataMask === 0) return [0,0,0];

  // Ratio VH/VV often correlates with vegetation moisture
  // VV is sensitive to surface roughness and soil moisture
  
  const ratio = sample.VH / sample.VV;
  
  // Normalize for visualization
  // Blue/Cyan for high moisture, Brown for low
  
  const moisture = Math.max(0, Math.min(1, ratio * 2.5));
  
  if (moisture < 0.3) return [0.8, 0.6, 0.4]; // Dry
  if (moisture < 0.6) return [0.8, 0.8, 0.6]; // Moderate
  return [0.2, 0.4, 0.8]; // Wet
}
`;
