'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { ThemeProvider, useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminPage() {
  const [places, setPlaces] = useState([])
  const [users, setUsers] = useState([])
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const token = Cookies.get('token')
    const res = await fetch('/api/auth/check', {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!res.ok) {
      router.push('/')
      return
    }

    const data = await res.json()
    if (data.user.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    loadData()
  }

  const loadData = async () => {
    const token = Cookies.get('token')

    const placesRes = await fetch('/api/places', {
      headers: { Authorization: `Bearer ${token}` }
    })

    const usersRes = await fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (placesRes.ok) {
      const data = await placesRes.json()
      setPlaces(data.places)
    }

    if (usersRes.ok) {
      const data = await usersRes.json()
      setUsers(data.users)
    }
  }

  const totalGiven = places.reduce((sum, p) => sum + (p.totalMoneyGiven || 0), 0)
  const totalUsed = places.reduce((sum, p) => sum + (p.totalMoneyUsed || 0), 0)
  const totalBalance = totalGiven - totalUsed
  const profitPercent = totalGiven > 0 ? ((totalBalance / totalGiven) * 100).toFixed(2) : 0

  const monthlyData = places.map(p => ({
    name: p.name,
    balance: (p.totalMoneyGiven || 0) - (p.totalMoneyUsed || 0)
  }))

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(monthlyData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')
    XLSX.writeFile(workbook, 'monthly_report.xlsx')
  }

  const exportPDF = async () => {
    const element = document.getElementById('report-section')
    const canvas = await html2canvas(element)
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF()
    pdf.addImage(imgData, 'PNG', 10, 10, 180, 100)
    pdf.save('report.pdf')
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-b from-blue-700 to-blue-500 min-h-screen" id="report-section">

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Kigali Dashboard</h1>
        <div className="flex gap-2">
          <Button
            className="bg-gray-100 text-black hover:bg-gray-200"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            Toggle {theme === 'dark' ? 'Light' : 'Dark'}
          </Button>
          <Button
            className="bg-yellow-500 text-white hover:bg-yellow-600"
            onClick={() => router.push('/other-page')}
          >
            Go to Other Page
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardHeader><CardTitle className="text-green-600">Money Given</CardTitle></CardHeader>
          <CardContent className="text-green-600 text-xl font-bold">${totalGiven.toFixed(2)}</CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader><CardTitle className="text-red-600">Money Used</CardTitle></CardHeader>
          <CardContent className="text-red-600 text-xl font-bold">${totalUsed.toFixed(2)}</CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader><CardTitle className="text-green-600">Balance</CardTitle></CardHeader>
          <CardContent className="text-green-600 text-xl font-bold">${totalBalance.toFixed(2)}</CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader><CardTitle className="text-orange-600">Profit %</CardTitle></CardHeader>
          <CardContent className="text-orange-600 text-xl font-bold">{profitPercent}%</CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader><CardTitle>Monthly Balance Chart</CardTitle></CardHeader>
        <CardContent style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="balance" fill="#4ade80" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button className="bg-green-500 text-white hover:bg-green-600" onClick={exportExcel}>Export Excel</Button>
        <Button className="bg-blue-500 text-white hover:bg-blue-600" onClick={exportPDF}>Download PDF</Button>
      </div>

      <Card className="bg-white">
        <CardHeader><CardTitle>Users</CardTitle></CardHeader>
        <CardContent>
          {users.map(u => (
            <div key={u.id} className="flex justify-between border-b py-2">
              <span>{u.email}</span>
              <span>{u.role}</span>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  )
}
