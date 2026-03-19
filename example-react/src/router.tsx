import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
  Link,
} from '@tanstack/react-router';
import ImperativePage from './pages/ImperativePage';
import DeclarativePage from './pages/DeclarativePage';
import IchimokuPage from './pages/IchimokuPage';

// Root layout with navigation
const rootRoute = createRootRoute({
  component: () => (
    <>
      <header>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1>lightweight-charts-indicators Demo</h1>
            <p>Technical indicators using LightweightCharts v5</p>
          </div>
          <nav style={{ display: 'flex', gap: 8 }}>
            <Link to="/" className="nav-link" activeProps={{ className: 'nav-link active' }}>
              Imperative
            </Link>
            <Link to="/declarative" className="nav-link" activeProps={{ className: 'nav-link active' }}>
              Declarative
            </Link>
            <Link to="/ichimoku" className="nav-link" activeProps={{ className: 'nav-link active' }}>
              Ichimoku Cloud
            </Link>
          </nav>
        </div>
      </header>
      <Outlet />
    </>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ImperativePage,
});

const declarativeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/declarative',
  component: DeclarativePage,
});

const ichimokuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ichimoku',
  component: IchimokuPage,
});

const routeTree = rootRoute.addChildren([indexRoute, declarativeRoute, ichimokuRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
