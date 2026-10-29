// wav-encode.mjs
//
// In-memory WAV byte encoding for the HTTP service. An HTTP response body
// needs a Buffer, not a file on disk, so this reuses the exact same
// header-building and sample-quantization primitives dsp/wav-writer.mjs
// exports (buildWavHeader, floatSampleTo24BitBytes, floatSampleTo16BitInt)
// -- the bytes produced here are byte-identical to what
// scripts/render-track.mjs would write to a .wav file for the same buffers;
// this module just skips the writeFile() step. wav-writer.mjs itself is
// treated as a stable black box here (its own writeWavFile is disk-only and
// async, which is why this thin sibling exists rather than reusing it
// directly).

import { buildWavHeader, floatSampleTo24BitBytes, floatSampleTo16BitInt } from '@red-cup-engineering/audio-services-section';

/**
 * Encodes a stereo (or mono) float sample buffer pair into a complete WAV
 * file's bytes, in memory.
 * @param {object} opts
 * @param {number} opts.sampleRate
 * @param {number} [opts.numChannels=2]
 * @param {number} [opts.bitDepth=24] - 16 or 24
 * @param {Float32Array|Float64Array|number[]} opts.bufferL
 * @param {Float32Array|Float64Array|number[]} [opts.bufferR] - required when numChannels is 2
 * @returns {Buffer}
 */
export function encodeWav({ sampleRate, numChannels = 2, bitDepth = 24, bufferL, bufferR }) {
  if (bitDepth !== 16 && bitDepth !== 24) {
    throw new Error(`Unsupported bitDepth: ${bitDepth}. Use 16 or 24.`);
  }
  if (numChannels === 2 && !bufferR) {
    throw new Error('numChannels is 2 but bufferR was not provided.');
  }

  const numSamplesPerChannel = bufferL.length;
  const bytesPerSample = bitDepth / 8;
  const dataByteLength = numSamplesPerChannel * numChannels * bytesPerSample;

  const header = buildWavHeader({ sampleRate, numChannels, bitDepth, dataByteLength });
  const data = Buffer.alloc(dataByteLength);

  let offset = 0;
  for (let i = 0; i < numSamplesPerChannel; i++) {
    const frame = numChannels === 1 ? [bufferL[i]] : [bufferL[i], bufferR[i]];
    for (let ch = 0; ch < frame.length; ch++) {
      const sample = frame[ch];
      if (bitDepth === 24) {
        const bytes = floatSampleTo24BitBytes(sample);
        data[offset] = bytes[0];
        data[offset + 1] = bytes[1];
        data[offset + 2] = bytes[2];
        offset += 3;
      } else {
        data.writeInt16LE(floatSampleTo16BitInt(sample), offset);
        offset += 2;
      }
    }
  }

  return Buffer.concat([header, data]);
}
