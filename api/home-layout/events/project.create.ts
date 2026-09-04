import handler from '../../home-layout.js';
export { config } from '../../home-layout.js';
export default function projectCreate(request: Parameters<typeof handler>[0], response: Parameters<typeof handler>[1]) {
  request.query.path = 'events/project.create';
  return handler(request, response);
}
