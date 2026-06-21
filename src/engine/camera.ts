export type Camera = {
  x: number;
  y: number;
  z: number;
};

export type BoundsLike = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

export function createDefaultCamera(): Camera {
  return { x: 0, y: 0, z: 1 };
}

export function panCamera(camera: Camera, dx: number, dy: number): Camera {
  return { ...camera, x: camera.x + dx, y: camera.y + dy };
}

export function scrollCamera(camera: Camera, deltaX: number, deltaY: number): Camera {
  return { ...camera, x: camera.x - deltaX, y: camera.y - deltaY };
}

export function zoomCameraAtPoint(camera: Camera, mouseX: number, mouseY: number, zoomFactor: number): Camera {
  const newZ = camera.z * zoomFactor;
  const newX = mouseX - (mouseX - camera.x) * zoomFactor;
  const newY = mouseY - (mouseY - camera.y) * zoomFactor;
  return { x: newX, y: newY, z: newZ };
}

export function getViewportCenterWorldPoint(camera: Camera, viewportWidth: number, viewportHeight: number) {
  return {
    x: (-camera.x + viewportWidth / 2) / camera.z,
    y: (-camera.y + viewportHeight / 2) / camera.z,
  };
}

export function fitCameraToBounds(bounds: BoundsLike, viewportWidth: number, viewportHeight: number, padding = 80): Camera {
  const safeWidth = Math.max(1, bounds.width + padding * 2);
  const safeHeight = Math.max(1, bounds.height + padding * 2);
  const scaleX = viewportWidth / safeWidth;
  const scaleY = viewportHeight / safeHeight;
  const z = Math.min(scaleX, scaleY, 2);
  const centerX = bounds.minX + bounds.width / 2;
  const centerY = bounds.minY + bounds.height / 2;
  return {
    x: viewportWidth / 2 - centerX * z,
    y: viewportHeight / 2 - centerY * z,
    z,
  };
}
