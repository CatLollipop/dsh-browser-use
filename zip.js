/** 无压缩 ZIP，只打包已经脱敏的文本。不引入压缩依赖。 */

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function u16(value) {
  return [value & 0xff, (value >> 8) & 0xff]
}

function u32(value) {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff]
}

/** @param {{ name: string, text: string }[]} files */
export function zipStore(files) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const file of files) {
    const name = Buffer.from(file.name)
    const data = Buffer.from(file.text)
    const crc = crc32(data)
    const local = Buffer.from([
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0),
    ])
    locals.push(Buffer.concat([local, name, data]))
    const central = Buffer.from([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0), ...u32(offset),
    ])
    centrals.push(Buffer.concat([central, name]))
    offset += local.length + name.length + data.length
  }
  const centralDir = Buffer.concat(centrals)
  const end = Buffer.from([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
    ...u32(centralDir.length), ...u32(offset), ...u16(0),
  ])
  return Buffer.concat([...locals, centralDir, end])
}
