declare module '#auth-utils' {
  interface User {
    id: number
    username: string
    name: string
    role: 'admin' | 'technician'
    mustChangePassword: boolean
  }
}

export {}
