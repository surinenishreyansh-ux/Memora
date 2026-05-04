const sharp = require('sharp');

// A basic quality score function based on image metadata or sharp analysis.
// For the MVP, we can keep it simple or do basic sharpness.
const calculateQualityScore = async (buffer) => {
  try {
    const metadata = await sharp(buffer).metadata();
    
    // Simple heuristic: higher resolution = better quality (just for MVP)
    // 4K resolution (approx 8.3MP) as a benchmark for 100%
    const resolution = metadata.width * metadata.height;
    let score = Math.min((resolution / 8294400) * 100, 100);
    
    return Math.round(score);
  } catch (error) {
    console.error('Error calculating quality score:', error);
    return 0;
  }
};

module.exports = { calculateQualityScore };
