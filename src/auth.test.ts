import { signInLocal as signIn } from './auth'
import { seedData } from './data'

describe('signInLocal', () => {
  const students = seedData.students

  it('signs a student in with the email on their record', () => {
    expect(signIn(' Kartik.Chauhan@GalgotiasUniversity.ac.in ', 'Kartik@360', students)).toEqual({
      role: 'student',
      studentId: 'kartik',
    })
  })

  it('signs the admin in', () => {
    expect(signIn('admin@galgotiasuniversity.ac.in', 'Admin@360', students)).toEqual({ role: 'admin' })
  })

  it('rejects a wrong password, an unknown email and another account’s password', () => {
    expect(signIn('kartik.chauhan@galgotiasuniversity.ac.in', 'wrong', students)).toBeNull()
    expect(signIn('nobody@galgotiasuniversity.ac.in', 'Kartik@360', students)).toBeNull()
    expect(signIn('shreyansh.pandey@galgotiasuniversity.ac.in', 'Kartik@360', students)).toBeNull()
    expect(signIn('admin@galgotiasuniversity.ac.in', 'Kartik@360', students)).toBeNull()
  })
})
