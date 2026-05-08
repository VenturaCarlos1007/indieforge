/**
 * Returns a human-readable relative time string in Spanish.
 * @param {string|Date} date
 * @returns {string}
 */
export function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 5) return 'justo ahora';
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  const months = Math.floor(days / 30);
  return `hace ${months} mes${months > 1 ? 'es' : ''}`;
}

const ACTION_LABELS = {
  created: 'creó',
  updated: 'actualizó',
  deleted: 'eliminó',
  uploaded: 'subió',
  commented: 'comentó en',
  assigned: 'fue asignado a',
  added_member: 'agregó un miembro a',
};

const RESOURCE_LABELS = {
  project: 'el proyecto',
  asset: 'un asset',
  task: 'una tarea',
  comment: 'un comentario',
  folder: 'una carpeta',
};

export function activityLabel(action, resourceType) {
  return `${ACTION_LABELS[action] || action} ${RESOURCE_LABELS[resourceType] || resourceType}`;
}
