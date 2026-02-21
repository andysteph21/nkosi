"use client"

import { useEffect, useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { inviteAdminAction, resendAdminInviteAction, toggleAdminActiveAction } from "@/app/actions/admin-users"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Profile } from "@/lib/types"

export function AdminsManagementTab() {
  const [admins, setAdmins] = useState<Profile[]>([])
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function fetchAdmins() {
    const supabase = createClient()
    const { data } = await supabase
      .from("profile")
      .select("*")
      .in("role", ["admin"])
      .order("created_at", { ascending: false })
    setAdmins((data ?? []) as Profile[])
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  function onInvite(formData: FormData) {
    startTransition(async () => {
      setError(null)
      const result = await inviteAdminAction(formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      await fetchAdmins()
    })
  }

  function onToggle(userId: string, active: boolean) {
    startTransition(async () => {
      await toggleAdminActiveAction(userId, !active)
      await fetchAdmins()
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Inviter un administrateur</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onInvite} className="grid md:grid-cols-4 gap-3">
            <Input name="firstName" placeholder="Prenom" required />
            <Input name="lastName" placeholder="Nom" required />
            <Input name="email" placeholder="Email" type="email" required />
            <Button type="submit" disabled={pending}>
              Inviter
            </Button>
          </form>
          {error ? <p className="text-sm text-destructive mt-3">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des administrateurs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Nom</th>
                  <th className="py-2 text-left">Email</th>
                  <th className="py-2 text-left">Statut</th>
                  <th className="py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b">
                    <td className="py-2">{admin.first_name} {admin.last_name}</td>
                    <td className="py-2">{admin.email}</td>
                    <td className="py-2">{admin.confirmed_at ? "Confirme" : "Invite"}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant={admin.is_active ? "destructive" : "outline"} onClick={() => onToggle(admin.user_id, admin.is_active)}>
                          {admin.is_active ? "Desactiver" : "Activer"}
                        </Button>
                        {!admin.confirmed_at ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              startTransition(async () => {
                                await resendAdminInviteAction(admin.user_id)
                                await fetchAdmins()
                              })
                            }
                          >
                            Renvoyer
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
