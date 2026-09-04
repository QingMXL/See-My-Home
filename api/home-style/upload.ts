import handler from '../home-style.js';
export { config } from '../home-style.js';
export default function upload(request: Parameters<typeof handler>[0], response: Parameters<typeof handler>[1]) {
  request.query.path = 'upload';
  return handler(request, response);
}
