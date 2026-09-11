import handler from '../../home-style.js';

export { config } from '../../home-style.js';

export default function styleSource(request: Parameters<typeof handler>[0], response: Parameters<typeof handler>[1]) {
  const token = Array.isArray(request.query.token) ? request.query.token[0] : request.query.token;
  request.query.path = `source/${token ?? ''}`;
  return handler(request, response);
}
