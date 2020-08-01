

// @ts-nocheck
import Swal from 'sweetalert2'
import ProductsApi from './productsapi.ts'
import { Auth,Hub } from 'aws-amplify'
import { CognitoUser, ISignUpResult } from 'amazon-cognito-identity-js'


Auth.configure({
  userPoolId: 'ap-south-1_D0SyfbAp5',//'ap-south-1_RYAPetD4n',//'us-east-1_SI8Jry3S2'
  userPoolWebClientId: '10nld23v181rqe6st5p1tg7v1e',//'7amacijh276o5l34sqmcqhod5c',//'6na2ooiugt93k55cuqemns63h2'
  oauth: {
    region: 'ap-south-1',
    domain: 'swiftprep3.auth.ap-south-1.amazoncognito.com',//'globomanticscongnito.auth.us-east-1.amazoncognito.com'
    scope: ['email', 'openid', 'aws.cognito.signin.user.admin'],
    redirectSignIn: 'https://127.0.0.1:8080',
    redirectSignOut: 'https://127.0.0.1:8080',
    responseType: 'code' // or 'token', note that REFRESH token will only be generated when the responseType is code
  }
})

var currentUserName: string = null

setupEvents();



async function appLoaded() {

  Hub.listen("auth", ({ payload: { event, data } }) => {
    switch (event) {
      case "signIn":
        getCurrentUser()
        break;
      case "signOut":
        getCurrentUser()
        break;
      case "customOAuthState":
        alert('custom state')
    }
  });

  await getCurrentUser();
  ProductsApi.initialize('product-list', 'cart-table')
 try{
  ProductsApi.loadProducts((await Auth.currentSession()).getAccessToken().getJwtToken());

 }
 catch{
  ProductsApi.loadProducts();
 }

}

async function onUpdatePassword() {
  var oldPassword=prompt('Enter your old password');
  var newPassword = prompt('Enter your new password');

  Auth.changePassword(await getCurrentUser(),oldPassword,newPassword).then(result=>{
    displayObject(result)
  })
  .catch(err=>displayObject(err))
}
function onForgotPassword() {
  var username = prompt('Enter your username');
  Auth.forgotPassword(username).then(result => {
    var confirmationCode = prompt('Enter confirmation code sent to your email')
    var newPassword = prompt('Enter your new password');
    Auth.forgotPasswordSubmit(username, confirmationCode, newPassword).then(confirationResult => {
      displayObject(confirationResult)
    })
      .catch(err => displayObject(err))
  })
    .catch(err => displayObject(err))
}
function onLogin() {
  let userData = {
    username: document.getElementById('login-email').value,
    password: document.getElementById('login-password').value,
  }
  Auth.signIn(userData.username, userData.password).then(async (result: any) => {

    if (result.challengeName == 'SOFTWARE_TOKEN_MFA') {

      var verificationCode = prompt('Enter your TOTP token');
      
      Auth.confirmSignIn(result, verificationCode, 'SOFTWARE_TOKEN_MFA').then(confirmSigninResult => {
        getCurrentUser()
      })
        .catch(err => { displayObject(err); })
    }
    else {
      getCurrentUser()
    }

  }).catch(err => {
    if (err.code == "UserNotConfirmedException") {
      currentUserName = userData.username
      toggleModal('confirm', true)
    }
    else {
      displayObject(err)
    }
  })
}
async function getCurrentUser(): Promise<CognitoUser> {
  try {

    var currentUser = <CognitoUser>(await Auth.currentAuthenticatedUser());
    console.log('getCurrentUser', currentUser);

    setUserState(currentUser)
    return currentUser
  }
  catch (err) {
    console.log('Error loading user', err);
    setUserState(null)
  }

}
async function onSignUp() {
  let userData = {
	name: document.getElementById('signup-name').value,
    username: document.getElementById('signup-email').value,
    password: document.getElementById('signup-password').value,
    confirmPassword: document.getElementById('signup-confirm-password').value,
	college: document.getElementById('signup-college').value,
	year: document.getElementById('signup-year').value
  }

  currentUserName = userData.name;

  if (userData.password != userData.confirmPassword) return Swal.fire('Password and Confirm Password do not match.')

	const user = Auth.signUp({
		username: userData.name,
		password: userData.password,
		attributes:
		{
		  email: userData.username,
		  name: userData.name,
		  'custom:custom:college': userData.college,
		  'custom:custom:year': userData.year
		}
	  }).then((result: ISignUpResult) => {
		if (!result.userConfirmed) {
		  toggleModal('confirm', true)
		}
		else {
		  toggleModal('login', true)
		}
	
	  }).catch(err => {
		displayObject(err)
	  })
  console.log({ user });	
}

async function onUserConfirmation() {
  var confirmationCode = document.getElementById('confirmation-code').value

  Auth.confirmSignUp(currentUserName, confirmationCode).then(result => {
    displayObject(result)
    toggleModal('login', true)
  }).catch(err => {
	  	//console.log({ 'Error on confirmation' : err });	

    displayObject(err)
  })
}

function onResendConfirmationCode() {
  Auth.resendSignUp(currentUserName).then(result => {
    Swal.fire('Confirmation code has been resent')
  }).catch(err => {
    displayObject(err)
  })
}

async function displayUserDetails() {
  Auth.userAttributes(await getCurrentUser()).then(result => {
    Swal.fire({
      title: 'User Attributes',
      html: `
      <ul class="list-group">
       ${result.map(z => `<li class="list-group-item"><b>${z.getName()}:</b> ${z.getValue()}</li>`).join('')}
     </ul>
       `
    })
  })
    .catch(err => displayObject(err))
}
async function updateUserAttributes(attributeName: string) {
  var value = prompt('Enter attribute Value');
  var attributes = {}
  attributes[attributeName] = value;
  Auth.updateUserAttributes(await getCurrentUser(), attributes).then(result => {
    displayObject(result)
  })
    .catch(err => displayObject(err))
}

async function checkMFAStatus() {
  Auth.getPreferredMFA(await getCurrentUser()).then(result => {
    displayObject(result)
    if (result == 'NOMFA') {
      Swal.fire({
        title: 'MFA Not Set',
        text: "Do you want to setup MFA?",
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes'
      }).then((result) => {
        if (result.value) {
          Auth.setupTOTP(user).then((code) => {
            var qrData = `otpauth://totp/GlobomanticsShop(${user.getUsername()})?secret=${code}`
            var url = 'https://api.qrserver.com/v1/create-qr-code/?data=' + encodeURI(qrData) + '&amp;size=300x300';
            Swal.fire({
              title: 'Scan this using your authenticator app',
              html: `<img src='${url}'/>
              <p>${code}</p>
              `,
              showCancelButton: true,
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#d33',
              confirmButtonText: 'Complete Setup'
            }).then(result => {
              if (result.value) {
                var verificationCode = prompt('Enter topt token, from your authenticator app');
                Auth.verifyTotpToken(user, verificationCode).then(() => {
                  Auth.setPreferredMFA(user, 'TOTP').then(otpResult => {
                    displayObject(otpResult)
                  })
                    .catch(err => displayObject(err))

                }).catch(e => {
                  displayObject(e)
                });
              }
            })
          });
        }
      })
    }
  })
}
function onLogout() {

  Auth.signOut({global:true}).then(result => {
    setUserState(null);
  }).catch(err => {
    displayObject(err)
  })
}
function onHostedUISignin() {
  Auth.federatedSignIn().then(result => {
    displayObject(result)
  }).catch((err: any) => {
    displayObject(err)
  })
}

function onGoogleSignin() {
  Auth.federatedSignIn({ provider: "Google" }).then(result => {
    displayObject(result)
  }).catch((err: any) => {
    displayObject(err)
  })
}

/*function onFacebookSignin() {
  Auth.federatedSignIn({ provider: "Facebook" }).then(result => {
    displayObject(result)
  }).catch((err: any) => {
    displayObject(err)
  })
}*/
async function onCheckout() {
  var currentUser = await getCurrentUser();
  if (!currentUser) Swal.fire('Please login first');
}
function setUserState(user: any) {
  var usernamePlaceholder = document.getElementById('username-placeholder');
  var loginButton = document.getElementById('login-button');
  var logoutButton = document.getElementById('logout-button');
  if (!user) {
    usernamePlaceholder.innerHTML = ''
    usernamePlaceholder.style.display = 'none'
    loginButton.style.display = 'block'
    logoutButton.style.display = 'none'
  }
  else {
    usernamePlaceholder.innerHTML = user.username
    usernamePlaceholder.style.display = 'block'
    loginButton.style.display = 'none'
    logoutButton.style.display = 'block'
  }
}
function toggleModal(modal: String, show: Boolean) {

  $('#confirm-modal').modal('hide');
  $('#login-modal').modal('hide');
  $('#signup-modal').modal('hide');

  if (show) $(`#${modal}-modal`).modal('show'); else $(`#${modal}-modal`).modal('hide');

}
function displayObject(data: any) {
  Swal.fire({
    title: data && (data.message || data.title || ''),
    html: `<div class="text-danger" style="text-align:left">  ${JSON.stringify(data || {}, null, 6)
      .replace(/\n( *)/g, function (match, p1) {
        return '<br>' + '&nbsp;'.repeat(p1.length);
      })}</div>`
  })
}

function setupEvents() {
  document.addEventListener("DOMContentLoaded", appLoaded)
  document.getElementById('login-form').addEventListener('submit', onLogin)
  document.getElementById('signup-form').addEventListener('submit', onSignUp)
  document.getElementById('confirmation-form').addEventListener('submit', onUserConfirmation)
  document.getElementById('resend-confirmation-code-button').addEventListener('click', onResendConfirmationCode)
  document.getElementById('logout-button').addEventListener('click', onLogout)
  document.getElementById('google-signin').addEventListener('click', onGoogleSignin)
  document.getElementById('hostedui-signin').addEventListener('click', onHostedUISignin)
  document.getElementById('view-user-attributes').addEventListener('click', displayUserDetails)
  document.getElementById('update-email-attribute').addEventListener('click', () => updateUserAttributes('email'))
  document.getElementById('update-phone-attribute').addEventListener('click', () => updateUserAttributes('phone_number'))
  document.getElementById('check-mfa-status').addEventListener('click', checkMFAStatus)
  document.getElementById('forgot-password-button').addEventListener('click', onForgotPassword)
  document.getElementById('update-password-button').addEventListener('click', onUpdatePassword)
  document.getElementById('checkout-button').addEventListener('click', onCheckout)
}
