/** 只记住曾经连通过的 Chrome / Edge。页面地址不进入配置。 */

const CATALOG = {
  edge: 'Microsoft Edge',
  chrome: 'Google Chrome',
}

export function browserIdFromUrl(url) {
  const text = String(url || '').trim().toLowerCase()
  if (text.startsWith('edge:') || text.startsWith('microsoft-edge:')) return 'edge'
  if (text.startsWith('chrome:') || text.startsWith('chrome-extension:')) return 'chrome'
  return ''
}

export function browserIdsFromTabs(tabs) {
  const ids = []
  for (const tab of Array.isArray(tabs) ? tabs : []) {
    const id = browserIdFromUrl(tab?.url)
    if (id && !ids.includes(id)) ids.push(id)
  }
  return ids
}

export function rememberBrowsers(saved, liveIds) {
  const list = Array.isArray(saved) ? saved.filter((item) => CATALOG[item?.id]).map((item) => ({ ...item })) : []
  for (const id of liveIds || []) {
    if (!CATALOG[id] || list.some((item) => item.id === id)) continue
    list.push({
      id,
      name: CATALOG[id],
      enabled: false,
      history: 'ask',
      siteTools: false,
      browse: 'allow',
      download: 'confirm',
      developerCdp: false,
      sites: [],
    })
  }
  return list
}
