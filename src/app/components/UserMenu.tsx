'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { LayoutList, LogOut, ShieldCheck, Store, User as UserIcon } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { Avatar } from './ui/Avatar'
import { isStaff } from '@/lib/permissions'

export default function UserMenu() {
    const { user, loading, login, logout } = useAuth()
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    if (loading) {
        return (
            <div className="w-8 h-8 rounded-full bg-sunken animate-pulse flex-shrink-0" />
        )
    }

    if (!user) {
        return (
            <button onClick={login} className="k-icbtn flex-shrink-0">
                <UserIcon size={16} aria-hidden="true" />
                <span className="k-icbtn__label hidden sm:inline">Iniciar sesión</span>
            </button>
        )
    }

    return (
        <div ref={menuRef} className="relative flex-shrink-0">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 rounded-[var(--radius-md)] hover:bg-sunken transition-colors p-1"
                aria-label="Menú de usuario"
            >
                <Avatar src={user.avatarUrl} name={user.name} tone="accent" />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-[var(--radius-lg)] border border-line bg-surface shadow-pop z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-hairline">
                        <p className="text-sm font-semibold text-ink truncate">{user.name}</p>
                        <p className="text-xs text-muted truncate">{user.email}</p>
                    </div>

                    {/* This menu used to link nowhere at all, so every private
                        surface — including the operator queue — was reachable
                        only by typing its URL. */}
                    <Link
                        href="/clasificados/mis"
                        onClick={() => setOpen(false)}
                        className="w-full px-4 py-3 text-left text-sm text-body hover:bg-sunken transition-colors flex items-center gap-2"
                    >
                        <LayoutList size={15} aria-hidden="true" />
                        Mis clasificados
                    </Link>

                    {user.dealership && (
                        <Link
                            href={
                                user.dealership.status === 'approved'
                                    ? '/comercios/panel'
                                    : '/clasificados/mis'
                            }
                            onClick={() => setOpen(false)}
                            className="w-full px-4 py-3 text-left text-sm text-body hover:bg-sunken transition-colors flex items-center gap-2"
                        >
                            <Store size={15} aria-hidden="true" />
                            {user.dealership.status === 'approved'
                                ? 'Mi comercio'
                                : 'Mi solicitud'}
                        </Link>
                    )}

                    {/* One entry, pointing at the panel rather than at one of
                        its screens. Reviewing comercios is a section inside
                        /admin like usuarios or comentarios, and a menu item
                        that jumped straight into it made the other four
                        unreachable unless you knew their URLs. */}
                    {isStaff(user) && (
                        <Link
                            href="/admin"
                            onClick={() => setOpen(false)}
                            className="w-full px-4 py-3 text-left text-sm text-body hover:bg-sunken transition-colors flex items-center gap-2 border-t border-hairline"
                        >
                            <ShieldCheck size={15} aria-hidden="true" />
                            Admin
                        </Link>
                    )}

                    <button
                        onClick={() => {
                            setOpen(false)
                            logout()
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-body hover:bg-sunken transition-colors flex items-center gap-2"
                    >
                        <LogOut size={15} aria-hidden="true" />
                        Cerrar sesión
                    </button>
                </div>
            )}
        </div>
    )
}
