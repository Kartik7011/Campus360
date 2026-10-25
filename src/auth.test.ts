import { signInLocal as signIn } from './auth'
import { seedData } from './data'

describe('signInLocal', () => {
  it('signs a student in with the email on their record', () => {
    expect(signIn(' Kartik.Chauhan@GalgotiasUniversity.ac.in ', 'Kartik@360', seedData)).toEqual({
      role: 'student',
      studentId: 'kartik',
    })
  })

  it('signs staff in with their office role', () => {
    expect(signIn('admin@galgotiasuniversity.ac.in', 'Admin@360', seedData)).toEqual({
      role: 'staff',
      staffId: 'staff-admin',
      staffRole: 'admin',
    })
    expect(signIn('accounts.anil@galgotiasuniversity.ac.in', 'Staff@360', seedData)).toMatchObject({
      staffRole: 'accounts',
    })
  })

  it('signs a parent in only while the student has given consent', () => {
    expect(signIn('parent.kartik@example.com', 'Parent@360', seedData)).toEqual({
      role: 'parent',
      studentId: 'kartik',
    })
    const withdrawn = {
      ...seedData,
      consents: seedData.consents.map((item) => ({ ...item, parentAccess: false })),
    }
    expect(signIn('parent.kartik@example.com', 'Parent@360', withdrawn)).toBeNull()
  })

  it('rejects a wrong password, an unknown email and another account’s password', () => {
    expect(signIn('kartik.chauhan@galgotiasuniversity.ac.in', 'wrong', seedData)).toBeNull()
    expect(signIn('nobody@galgotiasuniversity.ac.in', 'Kartik@360', seedData)).toBeNull()
    expect(signIn('shreyansh.pandey@galgotiasuniversity.ac.in', 'Kartik@360', seedData)).toBeNull()
    expect(signIn('admin@galgotiasuniversity.ac.in', 'Staff@360', seedData)).toBeNull()
  })
})
