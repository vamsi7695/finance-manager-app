import { useParams, Outlet, useLocation, Navigate } from 'react-router-dom';

export default function HomeDashboard() {
  const { homeId } = useParams<{ homeId: string }>();
  const location = useLocation();

  const isHomeRoot = location.pathname === `/homes/${homeId}`;

  if (isHomeRoot) {
    return <Navigate to={`/homes/${homeId}/expenses`} replace />;
  }

  return <Outlet />;
}
