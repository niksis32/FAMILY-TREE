/** Flatten nested message objects to dot-keys for batch translation. */

export function flattenMessages(obj, prefix = '') {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenMessages(value, path));
    } else if (typeof value === 'string') {
      out[path] = value;
    }
  }
  return out;
}

export function unflattenMessages(flat) {
  const root = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] ??= {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = value;
  }
  return root;
}
