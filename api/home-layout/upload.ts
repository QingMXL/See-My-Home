import handler from '../home-layout.js';
export { config } from '../home-layout.js';
export default function upload(request: Parameters<typeof handler>[0], response: Parameters<typeof handler>[1]) {
  request.query.path = 'upload';
  return handler(request, response);
}
