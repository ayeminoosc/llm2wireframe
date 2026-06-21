export type Camera = {
  x: number;
  y: number;
  z: number;
};

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
