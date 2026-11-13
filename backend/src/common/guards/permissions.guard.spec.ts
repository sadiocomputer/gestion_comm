import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RolesService } from '../../roles/roles.service';
import { RequireAnyPermission, RequirePermissions } from '../decorators/require-permissions.decorator';
import { PermissionsGuard } from './permissions.guard';

/** Construit un faux contexte de requête pour une méthode de controller. */
function contextFor(handler: () => void): ExecutionContext {
  class FakeController {}
  return {
    getHandler: () => handler,
    getClass: () => FakeController,
    switchToHttp: () => ({ getRequest: () => ({ user: { id: 1 } }) }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  // L'utilisateur de test possède uniquement "sales.create".
  const rolesService = {
    getUserPermissionCodes: jest.fn().mockResolvedValue(new Set(['sales.create'])),
  } as unknown as RolesService;
  const guard = new PermissionsGuard(new Reflector(), rolesService);

  // Méthodes « étiquetées » comme le ferait un controller.
  class Routes {
    unlabeled() {}
    @RequirePermissions('sales.create') create() {}
    @RequirePermissions('sales.create', 'sales.cancel') createAndCancel() {}
    @RequireAnyPermission('sales.read', 'sales.create') readOrCreate() {}
    @RequireAnyPermission('sales.read', 'reports.read') readOrReports() {}
  }
  const routes = Routes.prototype;

  it('refuse une route sans étiquette (interdit par défaut)', async () => {
    await expect(guard.canActivate(contextFor(routes.unlabeled))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('autorise quand toutes les permissions exigées sont présentes', async () => {
    await expect(guard.canActivate(contextFor(routes.create))).resolves.toBe(true);
  });

  it('refuse quand il manque une des permissions exigées', async () => {
    await expect(guard.canActivate(contextFor(routes.createAndCancel))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('« l’une ou l’autre » : une seule permission suffit', async () => {
    await expect(guard.canActivate(contextFor(routes.readOrCreate))).resolves.toBe(true);
  });

  it('« l’une ou l’autre » : refuse si aucune ne correspond', async () => {
    await expect(guard.canActivate(contextFor(routes.readOrReports))).rejects.toBeInstanceOf(ForbiddenException);
  });
})
