import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CONTRACT_VERSION = 'offline-narrated-video-renderer/v1';
const SEGMENTED_CONTRACT_VERSION = 'offline-narrated-video-renderer/v1-segmented';
const PRESENTATION_KEYS = new Set([
  'backgroundColor',
  'foregroundColor',
  'fontSize',
  'height',
  'width'
]);

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

/**
 * @param {unknown} value
 * @returns {string} deterministic, key-sorted JSON with a trailing newline
 */
export function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value))}\n`;
}

function requireText(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} must be a non-empty string`);
  if (value.includes('\0')) throw new TypeError(`${name} must not contain a NUL character`);
  return value.trim();
}

function requirePositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer`);
  return value;
}

function validatePresentation(presentation) {
  if (!presentation || typeof presentation !== 'object' || Array.isArray(presentation)) {
    throw new TypeError('channelPresentation must be an object');
  }
  for (const key of Object.keys(presentation)) {
    if (!PRESENTATION_KEYS.has(key)) throw new TypeError(`unsupported channelPresentation field: ${key}`);
  }
  const backgroundColor = requireText(presentation.backgroundColor, 'channelPresentation.backgroundColor');
  const foregroundColor = requireText(presentation.foregroundColor, 'channelPresentation.foregroundColor');
  return {
    backgroundColor,
    foregroundColor,
    fontSize: requirePositiveInteger(presentation.fontSize, 'channelPresentation.fontSize'),
    height: requirePositiveInteger(presentation.height, 'channelPresentation.height'),
    width: requirePositiveInteger(presentation.width, 'channelPresentation.width')
  };
}

function validateSingleCardInput(input) {
  const allowed = new Set(['title', 'body', 'channelPresentation']);
  for (const key of Object.keys(input)) if (!allowed.has(key)) throw new TypeError(`unsupported input field: ${key}`);
  const channelPresentation = validatePresentation(input.channelPresentation);
  return {
    title: requireText(input.title, 'title'),
    body: requireText(input.body, 'body'),
    channelPresentation
  };
}

function validateSegment(segment, index) {
  if (!segment || typeof segment !== 'object' || Array.isArray(segment)) throw new TypeError(`segments[${index}] must be an object`);
  const allowed = new Set(['heading', 'lines', 'narration']);
  for (const key of Object.keys(segment)) if (!allowed.has(key)) throw new TypeError(`unsupported segments[${index}] field: ${key}`);
  if (!Array.isArray(segment.lines)) throw new TypeError(`segments[${index}].lines must be an array of strings`);
  const lines = segment.lines.map((line, lineIndex) => requireText(line, `segments[${index}].lines[${lineIndex}]`));
  return {
    heading: requireText(segment.heading, `segments[${index}].heading`),
    lines,
    narration: requireText(segment.narration, `segments[${index}].narration`)
  };
}

function validateSegments(segments) {
  if (!Array.isArray(segments) || segments.length < 1) throw new TypeError('segments must be a non-empty array');
  return segments.map((segment, index) => validateSegment(segment, index));
}

function validateNarrationAudio(value, segmentCount) {
  if (value === undefined) return new Array(segmentCount).fill(null);
  if (!Array.isArray(value) || value.length !== segmentCount) {
    throw new TypeError(`narrationAudio must be an array of length ${segmentCount}`);
  }
  return value.map((entry, index) => (entry === null || entry === undefined ? null : requireText(entry, `narrationAudio[${index}]`)));
}

function validateSegmentedInput(input) {
  const allowed = new Set(['title', 'segments', 'channelPresentation', 'narrationAudio']);
  for (const key of Object.keys(input)) if (!allowed.has(key)) throw new TypeError(`unsupported input field: ${key}`);
  const segments = validateSegments(input.segments);
  return {
    title: requireText(input.title, 'title'),
    segments,
    channelPresentation: validatePresentation(input.channelPresentation),
    narrationAudio: validateNarrationAudio(input.narrationAudio, segments.length)
  };
}

/**
 * Validates and normalizes renderer input. Exactly one of `body` (single
 * text card) or `segments` (segmented narrated video) must be present.
 * @param {{title:string,body:string,channelPresentation:object}|{title:string,segments:Array<{heading:string,lines:string[],narration:string}>,channelPresentation:object,narrationAudio?:Array<string|null>}} input
 * @returns {object} normalized input
 * @throws {TypeError} on any malformed or unsupported field
 */
export function validateNarratedVideoInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  const hasBody = Object.prototype.hasOwnProperty.call(input, 'body');
  const hasSegments = Object.prototype.hasOwnProperty.call(input, 'segments');
  if (hasBody === hasSegments) throw new TypeError('input must have exactly one of body or segments');
  return hasBody ? validateSingleCardInput(input) : validateSegmentedInput(input);
}

function assEscape(text) {
  return text.replaceAll('\\', '\\\\').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('\n', '\\N');
}

function subtitleDocument(input) {
  const { width, height, fontSize, foregroundColor } = input.channelPresentation;
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\n\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Default,DejaVu Sans,${fontSize},${foregroundColor},${foregroundColor},&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,1,5,48,48,48,1\n\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\nDialogue: 0,0:00:00.00,0:00:20.00,Default,,0,0,0,,${assEscape(input.title)}\\N\\N${assEscape(input.body)}\n`;
}

function assTimestamp(totalSeconds) {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
}

function segmentedSubtitleDocument(plan, durationsSeconds) {
  const { width, height, fontSize, foregroundColor } = plan.input.channelPresentation;
  let cursor = 0;
  const events = plan.input.segments.map((segment, index) => {
    const start = cursor;
    const end = cursor + durationsSeconds[index];
    cursor = end;
    return `Dialogue: 0,${assTimestamp(start)},${assTimestamp(end)},Default,,0,0,0,,${assEscape(segment.heading)}\\N\\N${assEscape(segment.narration)}`;
  });
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\n\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Default,DejaVu Sans,${fontSize},${foregroundColor},${foregroundColor},&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,1,5,48,48,48,1\n\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n${events.join('\n')}\n`;
}

function segmentFileNames(index) {
  const padded = String(index).padStart(3, '0');
  return {
    narration: `segment-${padded}-narration.txt`,
    audio: `segment-${padded}-narration.wav`,
    clip: `segment-${padded}-clip.mp4`
  };
}

function createSingleCardRenderPlan(normalized) {
  return {
    contractVersion: CONTRACT_VERSION,
    input: normalized,
    files: { narration: 'narration.txt', subtitles: 'subtitles.ass', audio: 'narration.wav', artifact: 'narrated-video.mp4' },
    media: { frameRate: 30, audioSampleRate: 48000, videoCodec: 'libx264', audioCodec: 'aac' },
    steps: [
      { operation: 'synthesize-audio', program: 'ffmpeg' },
      { operation: 'assemble-video', program: 'ffmpeg' }
    ]
  };
}

function createSegmentedRenderPlan(normalized) {
  const segmentFiles = normalized.segments.map((_, index) => segmentFileNames(index));
  const steps = [];
  normalized.segments.forEach((_, index) => {
    const source = normalized.narrationAudio[index] === null ? 'flite' : 'provided';
    if (source === 'flite') steps.push({ operation: 'synthesize-audio', segment: index, program: 'ffmpeg', source });
    steps.push({ operation: 'probe-duration', segment: index, program: 'ffprobe', source });
    steps.push({ operation: 'render-slide', segment: index, program: 'ffmpeg' });
  });
  steps.push({ operation: 'concatenate-segments', program: 'ffmpeg' });
  steps.push({ operation: 'burn-subtitles', program: 'ffmpeg' });
  return {
    contractVersion: SEGMENTED_CONTRACT_VERSION,
    input: normalized,
    files: {
      subtitles: 'subtitles.ass',
      concatList: 'concat-list.txt',
      concatenated: 'concatenated.mp4',
      artifact: 'narrated-video.mp4',
      segments: segmentFiles
    },
    media: { frameRate: 30, audioSampleRate: 48000, videoCodec: 'libx264', audioCodec: 'aac' },
    steps
  };
}

/**
 * Builds a deterministic, hashable render plan from renderer input. Same
 * input (any key order) always yields the same `planBytes`/`planDigest`.
 * @param {object} input see {@link validateNarratedVideoInput}
 * @returns {object} plan with `planBytes` (canonical JSON) and `planDigest` (sha256 hex)
 */
export function createRenderPlan(input) {
  const normalized = validateNarratedVideoInput(input);
  const plan = 'segments' in normalized ? createSegmentedRenderPlan(normalized) : createSingleCardRenderPlan(normalized);
  const planBytes = canonicalJson(plan);
  return { ...plan, planBytes, planDigest: sha256(planBytes) };
}

/**
 * @param {ReturnType<typeof createRenderPlan>} plan
 * @returns {object} provenance with `provenanceBytes` and `provenanceDigest` (sha256 hex)
 * @throws {TypeError} when `plan` was not produced by {@link createRenderPlan}
 */
export function createProvenance(plan) {
  if (!plan?.planDigest || !plan?.planBytes) throw new TypeError('plan must be a plan created by createRenderPlan');
  const provenance = {
    contractVersion: plan.contractVersion,
    planDigest: plan.planDigest,
    inputDigest: sha256(canonicalJson(plan.input)),
    deterministicScope: 'plan-and-provenance-only',
    mediaByteDeterminism: 'not-claimed; encoder and timestamp output can vary by toolchain'
  };
  const provenanceBytes = canonicalJson(provenance);
  return { ...provenance, provenanceBytes, provenanceDigest: sha256(provenanceBytes) };
}

function resolveInWorkDirectory(workDirectory, relativeFile) {
  const base = path.resolve(workDirectory);
  const resolved = path.resolve(base, relativeFile);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) throw new TypeError('render output escaped workDirectory');
  return resolved;
}

function resolveFileTree(directory, node) {
  if (typeof node === 'string') return resolveInWorkDirectory(directory, node);
  if (Array.isArray(node)) return node.map((item) => resolveFileTree(directory, item));
  return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, resolveFileTree(directory, value)]));
}

function ffmpegCommands(plan, files) {
  const { width, height, backgroundColor } = plan.input.channelPresentation;
  return [
    {
      program: 'ffmpeg',
      args: ['-y', '-f', 'lavfi', '-i', `flite=textfile=${files.narration}:voice=slt`, '-ar', String(plan.media.audioSampleRate), files.audio]
    },
    {
      program: 'ffmpeg',
      args: ['-y', '-f', 'lavfi', '-i', `color=c=${backgroundColor}:s=${width}x${height}:r=${plan.media.frameRate}`, '-i', files.audio, '-vf', `subtitles=${files.subtitles}`, '-c:v', plan.media.videoCodec, '-c:a', plan.media.audioCodec, '-shortest', files.artifact]
    }
  ];
}

const STDERR_TAIL_CHARACTERS = 4000;

function stderrTailOf(result) {
  const stderr = result?.stderr;
  if (typeof stderr !== 'string' || stderr === '') return '';
  return stderr.length > STDERR_TAIL_CHARACTERS ? stderr.slice(-STDERR_TAIL_CHARACTERS) : stderr;
}

/**
 * Runs one injected command; a non-zero (or absent) result is refused as a
 * datum-carrying error rather than a bare exit code.
 * @param {(command:{program:string,args:string[]})=>Promise<{code:number,stdout?:string,stderr?:string}>} execute
 * @param {{program:string,args:string[]}} command
 * @returns {Promise<{code:number,stdout?:string,stderr?:string}>}
 * @throws {Error} with `error.datum = {program, args, code, stderrTail}` when the command exits non-zero
 */
async function runCommand(execute, command) {
  const result = await execute(command);
  if (!result || result.code !== 0) {
    const code = result?.code ?? 'unknown';
    const stderrTail = stderrTailOf(result);
    const error = new Error(stderrTail ? `${command.program} failed with code ${code}: ${stderrTail}` : `${command.program} failed with code ${code}`);
    error.datum = { program: command.program, args: command.args, code, stderrTail };
    throw error;
  }
  return result;
}

async function renderSingleCardVideo(plan, directory, execute) {
  const files = resolveFileTree(directory, plan.files);
  await writeFile(files.narration, `${plan.input.title}\n\n${plan.input.body}\n`, 'utf8');
  await writeFile(files.subtitles, subtitleDocument(plan.input), 'utf8');
  for (const command of ffmpegCommands(plan, files)) await runCommand(execute, command);
  return { artifactPath: files.artifact };
}

function synthesizeAudioCommand(plan, narrationFile, audioFile) {
  return { program: 'ffmpeg', args: ['-y', '-f', 'lavfi', '-i', `flite=textfile=${narrationFile}:voice=slt`, '-ar', String(plan.media.audioSampleRate), audioFile] };
}

function probeDurationCommand(audioFile) {
  return { program: 'ffprobe', args: ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', audioFile] };
}

function estimateMaxCharactersPerLine(width, fontSize) {
  return Math.max(8, Math.floor(width / (fontSize * 0.6)));
}

function wrapToWidth(text, maxCharacters) {
  const words = text.split(/\s+/).filter(Boolean);
  const wrapped = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharacters && current) {
      wrapped.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) wrapped.push(current);
  return wrapped.length ? wrapped : [''];
}

function wrapSegmentLines(lines, width, fontSize) {
  const maxCharacters = estimateMaxCharactersPerLine(width, fontSize);
  return lines.flatMap((line) => wrapToWidth(line, maxCharacters));
}

// Text sits inside a single-quoted drawtext value: escape backslash and '%'
// (a drawtext expansion trigger) and swap the apostrophe for a lookalike
// rather than attempt ffmpeg's brittle in-quote escaping.
function drawtextEscape(text) {
  return text.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll("'", '\u2019');
}

// drawtext renders a literal two-character "\n" inside its text value as a
// line break, so wrapped lines join on that marker rather than a real newline.
function drawtextLines(lines) {
  return lines.map(drawtextEscape).join('\\n');
}

// channelPresentation.foregroundColor is an ASS &HAABBGGRR style color (the
// subtitle style block uses it verbatim); drawtext's fontcolor wants
// 0xRRGGBB, so &H-prefixed values are reordered/reformatted here, and any
// other string (already in ffmpeg color syntax) passes through unchanged.
function drawtextColor(color) {
  const assMatch = /^&H([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(color);
  if (!assMatch) return color;
  const [, , blue, green, red] = assMatch;
  return `0x${red}${green}${blue}`;
}

function renderSlideCommand(plan, segment, audioPath, slideFile) {
  const { width, height, backgroundColor, foregroundColor, fontSize } = plan.input.channelPresentation;
  const fontColor = drawtextColor(foregroundColor);
  const headingFontSize = Math.round(fontSize * 1.5);
  const bodyLines = wrapSegmentLines(segment.lines, width - 96, fontSize);
  const headingFilter = `drawtext=text='${drawtextEscape(segment.heading)}':fontcolor=${fontColor}:fontsize=${headingFontSize}:x=(w-text_w)/2:y=64`;
  const bodyFilter = bodyLines.length
    ? `,drawtext=text='${drawtextLines(bodyLines)}':fontcolor=${fontColor}:fontsize=${fontSize}:line_spacing=8:x=(w-text_w)/2:y=${64 + headingFontSize + 32}`
    : '';
  return {
    program: 'ffmpeg',
    args: [
      '-y',
      '-f', 'lavfi', '-i', `color=c=${backgroundColor}:s=${width}x${height}:r=${plan.media.frameRate}`,
      '-i', audioPath,
      '-vf', `${headingFilter}${bodyFilter}`,
      '-c:v', plan.media.videoCodec,
      '-c:a', plan.media.audioCodec,
      '-shortest',
      slideFile
    ]
  };
}

function concatListDocument(clipPaths) {
  return `${clipPaths.map((clipPath) => `file '${clipPath.replaceAll("'", "'\\''")}'`).join('\n')}\n`;
}

function concatenateCommand(concatListFile, concatenatedFile) {
  return { program: 'ffmpeg', args: ['-y', '-f', 'concat', '-safe', '0', '-i', concatListFile, '-c', 'copy', concatenatedFile] };
}

function burnSubtitlesCommand(plan, concatenatedFile, subtitlesFile, artifactFile) {
  return {
    program: 'ffmpeg',
    args: ['-y', '-i', concatenatedFile, '-vf', `subtitles=${subtitlesFile}`, '-c:v', plan.media.videoCodec, '-c:a', 'copy', '-metadata', `title=${plan.input.title}`, artifactFile]
  };
}

async function renderSegmentedVideo(plan, directory, execute) {
  const files = resolveFileTree(directory, plan.files);
  const { segments, narrationAudio } = plan.input;

  const audioPaths = [];
  for (const [index, segment] of segments.entries()) {
    await writeFile(files.segments[index].narration, `${segment.narration}\n`, 'utf8');
    if (narrationAudio[index] === null) {
      await runCommand(execute, synthesizeAudioCommand(plan, files.segments[index].narration, files.segments[index].audio));
      audioPaths.push(files.segments[index].audio);
    } else {
      audioPaths.push(narrationAudio[index]);
    }
  }

  const durationsSeconds = [];
  for (const audioPath of audioPaths) {
    const result = await runCommand(execute, probeDurationCommand(audioPath));
    const durationSeconds = Number.parseFloat(result.stdout ?? '');
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new Error(`ffprobe returned a non-finite duration: ${JSON.stringify(result.stdout)}`);
    }
    durationsSeconds.push(durationSeconds);
  }

  // Subtitle cue timing is the only consumer of the probed durations: each
  // slide's own duration is instead governed natively by -shortest below.
  await writeFile(files.subtitles, segmentedSubtitleDocument(plan, durationsSeconds), 'utf8');

  for (const [index, segment] of segments.entries()) {
    await runCommand(execute, renderSlideCommand(plan, segment, audioPaths[index], files.segments[index].clip));
  }

  await writeFile(files.concatList, concatListDocument(files.segments.map((segmentFiles) => segmentFiles.clip)), 'utf8');
  await runCommand(execute, concatenateCommand(files.concatList, files.concatenated));
  await runCommand(execute, burnSubtitlesCommand(plan, files.concatenated, files.subtitles, files.artifact));

  return { artifactPath: files.artifact };
}

/**
 * Renders a narrated video (single text card or segmented) offline through
 * an injected command executor; this module performs no process spawning
 * of its own.
 * @param {{input:object, workDirectory:string, execute:(command:{program:string,args:string[]})=>Promise<{code:number,stdout?:string}>}} options
 * @returns {Promise<{artifactPath:string, artifactDigest:string, plan:object, provenance:object}>}
 * @throws {TypeError} on invalid input, workDirectory, or execute
 * @throws {Error} when an injected command exits non-zero or the artifact is empty
 */
export async function renderNarratedVideo({ input, workDirectory, execute }) {
  if (typeof workDirectory !== 'string' || workDirectory.trim() === '') throw new TypeError('workDirectory must be an explicit directory');
  if (typeof execute !== 'function') throw new TypeError('execute must be an injected function');
  const plan = createRenderPlan(input);
  const provenance = createProvenance(plan);
  const directory = path.resolve(workDirectory);
  await mkdir(directory, { recursive: true });
  const { artifactPath } = 'segments' in plan.input
    ? await renderSegmentedVideo(plan, directory, execute)
    : await renderSingleCardVideo(plan, directory, execute);
  const artifactBytes = await readFile(artifactPath);
  if (artifactBytes.byteLength === 0) throw new Error('renderer produced an empty artifact');
  return { artifactPath, artifactDigest: sha256(artifactBytes), plan, provenance };
}
