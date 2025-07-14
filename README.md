![Cardinal logo](./cardinal_logo.svg)

<h1>CardinalSDK React JS Template</h1>

Start working on your e-health React JS app with Cardinal in a few minutes, by using our dedicated React JS template:

```
yarn create react-app my-health-tech-app --template @icure/cra-template-typescript-cardinal-sdk
```

Once your app is created, rename the file `.env.default` to `.env`, complete the values it contains:

- **REACT_APP_EXTERNAL_SERVICES_SPEC_ID**,
- **REACT_APP_EMAIL_AUTHENTICATION_PROCESS_ID** and/or **REACT_APP_SMS_AUTHENTICATION_PROCESS_ID**,
- **REACT_APP_PARENT_ORGANISATION_ID**,
- **REACT_APP_FRIENDLY_CAPTCHA_SITE_KEY**

And start your React app by executing

```
cd my-health-tech-app && yarn start
```

Check out our [Quick Start](https://docs.icure.com/how-to/index) in order to know what are those information and how to get them from our [Cockpit Portal](https://cockpit.icure.cloud/).

_WARNING: Without these information, you won't be able to complete an authentication_

Not familiar with `create-react-app` ? Have a look to their [repository](https://github.com/facebook/create-react-apphttps://github.com/facebook/create-react-app).

Looking for React Native template instead ? Head [here](https://github.com/icure/icure-medical-device-react-native-boilerplate-app-template).

## Requirements

Make sure the following tools are installed on your machine:

- [NodeJS](https://nodejs.org/en) (Node 16 + at least)
- [Yarn Package manager](https://yarnpkg.com/getting-started/install)

## Which technologies are used ?

- [ReactJS](https://react.dev/)
- [Redux Toolkit](https://redux-toolkit.js.org/), as a state container
- [localForage](https://github.com/localForage/localForage), as an asynchronous Javascript storage
- [FriendlyCaptcha](https://friendlycaptcha.com/), as a CAPTCHA solution

We chosed this set of technologies, because we consider them as the most efficient ones to work with.
Nonetheless, you can of course work with the technologies of your choices and still integrate the iCure MedTech Typescript SDK in your React JS app.

## What includes this template ?

- The [Cardinal SDK](https://github.com/icure) dependency;
- A first implementation of the [authentication flow](https://docs.icure.com/how-to/initialize-the-sdk/), both registration and login.

## What's next ?

Check out our [Documentation](https://docs.icure.com/) and more particularly our [How To's](https://docs.icure.com/how-to/index), in order to start implementing new functionalities inside your React JS App !

## Contact us:

- [Cardinal website](https://cardinalsdk.com/en)
- [Help Centre](https://icure.atlassian.net/servicedesk/customer/user/login?destination=portals)
