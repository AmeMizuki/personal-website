// On /contact/ in the dev browser:
// await (await import('/scripts/check-contact.mjs')).checkContact()
export function checkContact() {
  const form = document.querySelector('form[aria-labelledby="contact-title"]')
  const name = form.querySelector('#contact-name')
  const email = form.querySelector('#contact-email')
  const category = form.querySelector('#contact-category')
  const message = form.querySelector('#contact-message')
  const consent = form.querySelector('input[type="checkbox"]')
  const controls = [name, email, category, message, consent]
  const saved = controls.map(control => ({ value: control.value, checked: control.checked }))
  let submitted = false
  const intercept = event => { event.preventDefault(); submitted = true }
  form.addEventListener('submit', intercept)
  const expect = (allowed, reason) => {
    submitted = false
    form.requestSubmit()
    if (submitted !== allowed) throw new Error(reason)
  }
  try {
    name.value = '表單測試'
    email.value = 'contact-check@example.com'
    category.value = '專案協同開發'
    message.value = '討論網站專案合作。'
    consent.checked = true
    const phone = form.querySelector('#contact-phone')
    const savedPhone = phone.value
    phone.value = ''
    try {
      expect(true, 'A complete inquiry must submit without a phone number')
    } finally {
      phone.value = savedPhone
    }
    for (const control of controls) {
      const value = control.value
      if (control === consent) control.checked = false
      else control.value = ''
      expect(false, `Missing ${control.name} must prevent submission`)
      if (control === consent) control.checked = true
      else control.value = value
    }
    email.value = 'not-an-email'
    expect(false, 'An invalid email must prevent submission')
    email.value = 'contact-check@example.com'
    name.value = '   '
    expect(false, 'A whitespace-only name must prevent submission')
    return 'PASS: required fields, privacy consent and email validation block submission; phone is optional'
  } finally {
    form.removeEventListener('submit', intercept)
    controls.forEach((control, index) => {
      control.value = saved[index].value
      if (control === consent) control.checked = saved[index].checked
    })
  }
}
