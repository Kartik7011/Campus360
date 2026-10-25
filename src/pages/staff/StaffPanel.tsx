import { staffTitles } from '../../App'
import { useCampus } from '../../store'
import { AccountsOffice } from './AccountsOffice'
import { ExamOffice } from './ExamOffice'
import { AdminDesk, HodDesk, MentorDesk, RegistrarDesk } from './PeopleDesk'
import { PlacementOffice } from './PlacementOffice'
import { DashboardView } from './shared'

// Each office sees only its own work (requirement.md §2).
export function StaffPanel() {
  const { staff, remote } = useCampus()
  if (!staff) return null
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          {staffTitles[staff.role]}
          {staff.department ? ` · ${staff.department}` : ''}. Every change you make is logged with your name.
        </p>
        {!remote && (
          <span className="self-start rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
            Browser-only mode: changes stay on this device
          </span>
        )}
      </div>
      {staff.role === 'exam' && <ExamOffice />}
      {staff.role === 'accounts' && <AccountsOffice />}
      {staff.role === 'placement' && <PlacementOffice />}
      {staff.role === 'mentor' && <MentorDesk />}
      {staff.role === 'hod' && <HodDesk />}
      {staff.role === 'dean' && <DashboardView />}
      {staff.role === 'registrar' && <RegistrarDesk />}
      {staff.role === 'admin' && <AdminDesk />}
    </div>
  )
}
