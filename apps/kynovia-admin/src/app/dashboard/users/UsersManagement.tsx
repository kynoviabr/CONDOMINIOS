"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PhoneInput } from "../condominiums/PhoneInput";
import {
  createCondominiumAdminFromUsersAction,
  removeCondominiumAdminAction,
  removePlatformAdminAction,
  updateCondominiumAdminAction,
  updatePlatformAdminAction
} from "../condominiums/actions";

export type CondominiumUserOption = {
  id: string;
  name: string;
};

export type AdminUserListItem = {
  accessScope: "client_admin" | "platform_admin";
  condominiumId: string | null;
  condominiumName: string;
  email: string;
  fullName: string;
  id: string;
  profileId: string;
  whatsapp: string | null;
};

type UsersManagementProps = {
  condominiums: CondominiumUserOption[];
  users: AdminUserListItem[];
};

type DrawerMode =
  | { type: "create"; condominiumId?: string }
  | { type: "edit"; user: AdminUserListItem }
  | null;

const platformGroupId = "__platform_admins";

function RequiredText({ children }: { children: string }) {
  return (
    <span>
      <span aria-hidden="true">*</span> {children}
    </span>
  );
}

function userMatches(user: AdminUserListItem, query: string) {
  const target = `${user.condominiumName} ${user.fullName} ${user.email} ${user.whatsapp ?? ""}`.toLowerCase();
  return target.includes(query);
}

export function UsersManagement({ condominiums, users }: UsersManagementProps) {
  const [query, setQuery] = useState("");
  const [selectedCondominium, setSelectedCondominium] = useState("all");
  const [createScope, setCreateScope] = useState<"client_admin" | "platform_admin">("client_admin");
  const [expandedClientIds, setExpandedClientIds] = useState<Set<string>>(
    () => new Set([platformGroupId, ...condominiums.slice(0, 1).map((condominium) => condominium.id)])
  );
  const [drawer, setDrawer] = useState<DrawerMode>(null);
  const normalizedQuery = query.trim().toLowerCase();

  const usersByClient = useMemo(() => {
    const grouped = new Map<string, AdminUserListItem[]>();

    users.forEach((user) => {
      const groupId = user.accessScope === "platform_admin" ? platformGroupId : user.condominiumId;
      if (!groupId) {
        return;
      }
      const group = grouped.get(groupId) ?? [];
      group.push(user);
      grouped.set(groupId, group);
    });

    return grouped;
  }, [users]);

  const visibleClients = useMemo(
    () => {
      const groups = [
        {
          id: platformGroupId,
          isPlatform: true,
          name: "Admins da Kynovia"
        },
        ...condominiums.map((condominium) => ({
          ...condominium,
          isPlatform: false
        }))
      ];

      return groups
        .map((condominium) => {
          const clientUsers = usersByClient.get(condominium.id) ?? [];
          const matchingUsers = normalizedQuery
            ? clientUsers.filter((user) => userMatches(user, normalizedQuery))
            : clientUsers;
          const clientMatches = condominium.name.toLowerCase().includes(normalizedQuery);
          const visibleUsers = normalizedQuery && clientMatches ? clientUsers : matchingUsers;

          return {
            ...condominium,
            users: visibleUsers,
            userCount: clientUsers.length,
            visible: selectedCondominium === "all" || selectedCondominium === condominium.id,
            matches: !normalizedQuery || clientMatches || matchingUsers.length > 0
          };
        })
        .filter((client) => client.visible && client.matches);
    },
    [condominiums, normalizedQuery, selectedCondominium, usersByClient]
  );

  const filteredUserCount = visibleClients.reduce((total, client) => total + client.users.length, 0);
  const clientsWithUsers = condominiums.filter((condominium) => (usersByClient.get(condominium.id) ?? []).length > 0).length;
  const platformAdminCount = usersByClient.get(platformGroupId)?.length ?? 0;
  const hasActiveFilter = normalizedQuery || selectedCondominium !== "all";

  function toggleClient(clientId: string) {
    setExpandedClientIds((current) => {
      const next = new Set(current);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  }

  return (
    <>
      <section className="users-command-center">
        <div className="users-stat">
          <span>Com usuários</span>
          <strong>{clientsWithUsers}</strong>
        </div>
        <div className="users-stat">
          <span>Admins Kynovia</span>
          <strong>{platformAdminCount}</strong>
        </div>
        <div className="users-stat">
          <span>Usuários</span>
          <strong>{users.length}</strong>
        </div>
        <button
          className="users-primary-action"
          type="button"
          onClick={() => {
            setCreateScope("client_admin");
            setDrawer({ type: "create" });
          }}
        >
          Novo usuário
        </button>
      </section>

      <section className="users-workspace">
        <div className="users-toolbar">
          <label>
            Buscar
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cliente, nome, e-mail ou WhatsApp"
            />
          </label>
          <label>
            Cliente
            <select value={selectedCondominium} onChange={(event) => setSelectedCondominium(event.target.value)}>
              <option value="all">Todos os acessos</option>
              <option value={platformGroupId}>Admins da Kynovia</option>
              {condominiums.map((condominium) => (
                <option key={condominium.id} value={condominium.id}>
                  {condominium.name}
                </option>
              ))}
            </select>
          </label>
          {hasActiveFilter ? (
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedCondominium("all");
              }}
            >
              Limpar filtros
            </button>
          ) : null}
        </div>

        <div className="users-results-header">
          <span>{visibleClients.length} grupos</span>
          <span>{filteredUserCount} usuários na visão</span>
        </div>

        <div className="client-user-list">
          {visibleClients.map((client) => {
            const isExpanded = normalizedQuery || selectedCondominium !== "all" || expandedClientIds.has(client.id);
            const firstUsers = (usersByClient.get(client.id) ?? []).slice(0, 3);

            return (
              <article className="client-user-group" key={client.id}>
                <button className="client-user-summary" type="button" onClick={() => toggleClient(client.id)}>
                  <span className="client-chevron" aria-hidden="true">
                    {isExpanded ? "-" : "+"}
                  </span>
                  <span className="client-user-name">{client.name}</span>
                  <span className="client-user-preview">
                    {firstUsers.length ? firstUsers.map((user) => user.fullName).join(", ") : "Nenhum usuário"}
                  </span>
                  <span className={client.isPlatform ? "client-user-count platform" : "client-user-count"}>
                    {client.userCount}
                  </span>
                </button>

                {isExpanded ? (
                  <div className="user-compact-table">
                    <div className="user-compact-head" aria-hidden="true">
                      <span>Nome</span>
                      <span>E-mail</span>
                      <span>WhatsApp</span>
                      <span>Ações</span>
                    </div>
                    {client.users.length ? (
                      client.users.map((user) => (
                        <div className="user-compact-row" key={user.id}>
                          <span>{user.fullName}</span>
                          <span>{user.email || "Não informado"}</span>
                          <span>{user.whatsapp || "Não informado"}</span>
                          <span className="user-row-actions">
                            <button type="button" onClick={() => setDrawer({ type: "edit", user })}>
                              Editar
                            </button>
                            {user.condominiumId ? (
                              <Link href={`/dashboard/condominiums/${user.condominiumId}`}>Cliente</Link>
                            ) : (
                              <span>Kynovia</span>
                            )}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="user-empty-row">
                        <span>Nenhum usuário vinculado.</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCreateScope(client.isPlatform ? "platform_admin" : "client_admin");
                            setDrawer({ type: "create", condominiumId: client.isPlatform ? undefined : client.id });
                          }}
                        >
                          Criar usuário
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        {!visibleClients.length ? (
          <div className="user-empty-state">
            <h3>Nenhum resultado</h3>
            <p>Ajuste a busca ou limpe os filtros para ver todos os clientes.</p>
          </div>
        ) : null}
      </section>

      {drawer ? (
        <div className="user-drawer-backdrop" role="presentation" onClick={() => setDrawer(null)}>
          <aside
            aria-label={drawer.type === "create" ? "Novo usuário" : "Editar usuário"}
            className="user-drawer"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="user-drawer-header">
              <div>
                <span>{drawer.type === "create" ? "Novo acesso" : drawer.user.condominiumName}</span>
                <h2>{drawer.type === "create" ? "Criar usuário" : drawer.user.fullName}</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setDrawer(null)} aria-label="Fechar">
                x
              </button>
            </div>

            {drawer.type === "create" ? (
              <form className="admin-form user-drawer-form" action={createCondominiumAdminFromUsersAction}>
                <input name="access_scope" type="hidden" value={createScope === "platform_admin" ? "platform_admin" : "client_admin"} />
                <div className="access-scope-control" role="group" aria-label="Tipo de acesso">
                  <button
                    className={createScope === "client_admin" ? "active" : ""}
                    type="button"
                    onClick={() => setCreateScope("client_admin")}
                  >
                    Admin de Cliente
                  </button>
                  <button
                    className={createScope === "platform_admin" ? "active" : ""}
                    type="button"
                    onClick={() => setCreateScope("platform_admin")}
                  >
                    Admin da Kynovia
                  </button>
                </div>
                {createScope === "client_admin" ? (
                  <label>
                    <RequiredText>Cliente</RequiredText>
                    <select name="condominium_id" required defaultValue={drawer.condominiumId ?? ""}>
                      <option value="" disabled>
                        Selecione um cliente
                      </option>
                      {condominiums.map((condominium) => (
                        <option key={condominium.id} value={condominium.id}>
                          {condominium.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label>
                  <RequiredText>Nome completo</RequiredText>
                  <input name="full_name" required placeholder="Mariana Oliveira" />
                </label>
                <label>
                  <RequiredText>E-mail</RequiredText>
                  <input name="email" type="email" required placeholder="admin@cliente.com.br" />
                </label>
                <label>
                  <RequiredText>WhatsApp</RequiredText>
                  <PhoneInput name="admin_whatsapp" required />
                </label>
                <button type="submit">Criar usuário</button>
              </form>
            ) : (
              <>
                <form
                  className="admin-form user-drawer-form"
                  action={drawer.user.accessScope === "platform_admin" ? updatePlatformAdminAction : updateCondominiumAdminAction}
                >
                  <input name="return_path" type="hidden" value="/dashboard/users" />
                  {drawer.user.condominiumId ? (
                    <input name="condominium_id" type="hidden" value={drawer.user.condominiumId} />
                  ) : null}
                  <input name="profile_id" type="hidden" value={drawer.user.profileId} />
                  <label>
                    <RequiredText>Nome</RequiredText>
                    <input name="full_name" required defaultValue={drawer.user.fullName} />
                  </label>
                  <label>
                    <RequiredText>E-mail</RequiredText>
                    <input name="email" type="email" required defaultValue={drawer.user.email} />
                  </label>
                  <label>
                    WhatsApp
                    <PhoneInput name="admin_whatsapp" defaultValue={drawer.user.whatsapp} />
                  </label>
                  <label>
                    Nova senha
                    <input
                      name="password"
                      type="password"
                      minLength={10}
                      placeholder="Preencha apenas se quiser trocar"
                    />
                  </label>
                  <button type="submit">Salvar alterações</button>
                </form>

                <div className="user-drawer-danger">
                  <form action={drawer.user.accessScope === "platform_admin" ? removePlatformAdminAction : removeCondominiumAdminAction}>
                    <input name="return_path" type="hidden" value="/dashboard/users" />
                    {drawer.user.condominiumId ? (
                      <>
                        <input name="condominium_id" type="hidden" value={drawer.user.condominiumId} />
                        <input name="membership_id" type="hidden" value={drawer.user.id} />
                      </>
                    ) : (
                      <input name="profile_id" type="hidden" value={drawer.user.profileId} />
                    )}
                    <button className="danger" type="submit">
                      Remover acesso
                    </button>
                  </form>
                </div>
              </>
            )}
          </aside>
        </div>
      ) : null}
    </>
  );
}
