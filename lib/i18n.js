'use strict';

const util = require('util');

var stringsDe = {
    Speech_SwitchedLanguage: 'Ich spreche jetzt Deutsch mit dir!',
    
    Speech_Session_Expired: 'Die Sitzung ist abgelaufen. Bitte nochmal probieren!',
    Speech_NoQRDetected: 'Ich konnte leider auf dem Bild keinen QR-Code identifizieren. Bitte achte darauf, dass das Bild scharf ist und der QR-Code nicht zu klein.',
    
    Share_Title: 'Kleinbeträge unter Freunden teilen',
    Share_Subtitle: 'Begleiche kleine Alltags-Schulden (Cafe Latte oder Benzingeld) mit Itipu.',
  
    Menu_Balance: 'Guthaben abfragen',
    Menu_Topup: 'Guthaben aufladen',
    Menu_Withdraw: 'Guthaben abheben',
    Menu_Send: 'Geld senden',
    Menu_Backup: 'Sicherungskopie',
    
    Web_CloseWindow: 'Du kannst dieses Fenster schließen!',
    Web_ReadyCloseWindow: 'Fertig, du kannst dieses Fenster schließen!',
    Web_ErrorTitle: 'Da ist etwas schiefgegangen',
    Web_SuccessTitle: 'OK',
    
    Facebook_Login: 'Facebook Anmeldung notwendig ...',
    Facebook_LoginButton: '... hier klicken!',
    
    Create_FacebookLoginFailed: 'Leider konnte ich dich nicht an Facebook anmelden.',
    Create_FacebookNotGranted: 'Es tut mir leid, ohne deine Erlaubnis, auf deine Freundesliste zuzugreifen, kann ich nichts machen!',
    
    Create_SetPINLink: 'Zum Festlegen deiner PIN ... ',
    Create_SetPINButton: '... hier klicken!',
    Create_PageTitle: 'PIN wählen',
    Create_WarnPIN: 'PIN nicht vergessen, sonst ist dein Guthaben unwiederbringlich verloren!',
    Create_LabelPIN: 'PIN wählen:',
    Create_LabelRepeatPIN: 'Wiederholen:',
    Create_PlaceholderPIN: 'PIN wählen',
    Create_PlaceholderRepeatPIN: 'PIN wiederholen',
    Create_ButtonCancel: 'Abbrechen',
    Create_ButtonContinue: 'Weiter',    
    
    Create_GenerateWallet: 'Erzeuge Bitcoin-Wallet ...',
    Create_Encrypting: 'Verschlüssle Bitcoin-Wallet ...',
    Create_EncryptionFailed: 'Beim Verschlüsseln ist ein Fehler aufgetreten.',
    Create_Failed: 'Es ist leider auf meiner Seite ein Fehler aufgetreten. Aber mein Programmierer hat das bereits gesehen und wird sich darum kümmern. Sorry!',
    Create_WalletExists: 'Für dich habe ich schon ein Konto registriert.',
    
    Send_FriendNotFound: 'Leider kann ich unter "%s" niemanden finden. Das kann an Tippfehlern im Namen liegen, oder vielleicht hat dein(e) Freund(in) einfach noch kein Konto und du musst ihn/sie erst einladen.',
    Send_FoundMultipleFriends: 'Ich habe mehrere Personen gefunden. Bitte wähle die richtige mithilfe des Profilbildes aus. ACHTUNG VOR GEFÄLSCHTEN PROFILEN!',
    Send_SendButton: 'Ja, Geld senden!',
    Send_MoneySent_Sender: '%s wurden an %s gesendet.',
    Send_MoneySent_Receiver: 'Du hast %s von %s erhalten.',
    Send_PageTitle: 'Geld senden an ',
    Send_LabelPIN: 'PIN:',
    Send_PlaceholderPIN: 'PIN eingeben',
    Send_ButtonCancel: 'Abbrechen',
    Send_ButtonContinue: 'Weiter',
    
    Send_Decrypting: 'Entschlüssele Konto ...',
    Send_DecryptionFailed: 'Entschlüsseln fehlgeschlagen - falscher PIN ?',
    Send_NotEnoughBalance: 'Es ist nicht genügend Guthaben vorhanden.',
    Send_AmountTooLow: 'Der Betrag ist zu gering (kleiner als die Transaction Fee).',
    Send_TransactionFailed: 'Überweisung fehlgeschlagen - nicht genügend Guthaben oder Betrag zu niedrig.',

    Withdraw_Link: 'Zur Überweisung deines Guthabens auf die Bitcoin-Adresse "%s" ...',
    Withdraw_LinkButton: '... hier klicken!',
    Withdraw_Withdrawn: 'Dein Guthaben wurde auf die Bitcoin-Adresse "%s" überwiesen.',
    Withdraw_PageTitle: 'Guthaben überweisen auf ',
    Withdraw_LabelPIN: 'PIN:',
    Withdraw_ButtonCancel: 'Abbrechen',
    Withdraw_ButtonContinue: 'Weiter',
    Withdraw_PlaceholderPIN: 'PIN eingeben',

    Withdraw_Decrypting: 'Entschlüssele Konto ...',
    Withdraw_DecryptionFailed: 'Entschlüsseln fehlgeschlagen - falscher PIN ?',
    Withdraw_NotEnoughBalance: 'Es ist nicht genügend Guthaben vorhanden.',
    Withdraw_TransactionFailed: 'Überweisung fehlgeschlagen - nicht genügend Guthaben ?',    
    
    Balance: 'Dein Guthaben beträgt %s BTC (~ €%s).',
  };

var stringsEn = {
    Speech_SwitchedLanguage: 'Now I\'m speaking in english, sire',
   
    Speech_Session_Expired: 'Your session expired. Please retry!',
    Speech_NoQRDetected: 'I wasn\'t able to detect a QR code in this picture. Please consider the picture must not be blurred and the QR code must not be too small.',
    
    Share_Title: 'Tip your friends',
    Share_Subtitle: 'Pay your everyday depts (for your frappucino or for transportation) with Itipu.',
    
    Menu_Balance: 'Show Balance',
    Menu_Topup: 'Topup Balance',
    Menu_Withdraw: 'Withdrawal',
    Menu_Send: 'Send Money',
    Menu_Backup: 'Backup Wallet',

    Web_CloseWindow: 'Please close this window!',
    Web_ReadyCloseWindow: 'Ready, please close this window!',
    Web_ErrorTitle: 'Sorry, this didn\'t work',
    Web_SuccessTitle: 'OK',
    
    Facebook_Login: 'Facebook Login required ...',
    Facebook_LoginButton: '... click here!',
 
    Create_FacebookLoginFailed: 'Unfortunately, I wasn\'t able to connect to Facebook.',
    Create_FacebookNotGranted: 'Sorry, without the permission to lookup your friends in Facebook, I cannot work properly.',
 
    Create_SetPINLink: 'To choose your PIN ... ',
    Create_SetPINButton: '... click here!',
    Create_PageTitle: 'Choose PIN',
    Create_WarnPIN: 'Please don\'t forget your PIN, otherwise your funds are lost!',
    Create_LabelPIN: 'Choose PIN:',
    Create_LabelRepeatPIN: 'Repeat:',
    Create_PlaceholderPIN: 'Choose PIN',
    Create_PlaceholderRepeatPIN: 'Repeat PIN',
    Create_ButtonCancel: 'Cancel',
    Create_ButtonContinue: 'Continue', 
    
    Create_GenerateWallet: 'Generating Bitcoin Wallet ...',
    Create_Encrypting: 'Encrypting Bitcoin Wallet ...',
    Create_EncryptionFailed: 'Encryption failed.',
    Create_Ready: 'Ready, please close this window!',
    Create_Failed: 'Something failed on my side, sorry. My programmer has been notified and will take care of it.',
    Create_WalletExists: 'There is already an account for you.',
    
    Send_FriendNotFound: 'I cannot find your friend "%s". Maybe because of typographic errors, or maybe your friend doesn\'t own an Itipu account and you have to invite him/her.',
    Send_FoundMultipleFriends: 'I\'ve found more than one matching person. Please select the right one below. BEWARE OF FAKE PROFILES!',
    Send_SendButton: 'OK, send it!',
    Send_MoneySent_Sender: 'Sent %s to %s.',
    Send_MoneySent_Receiver: 'You\'ve received %s from %s.',
    Send_PageTitle: 'Send money to ',
    Send_LabelPIN: 'PIN:',
    Send_ButtonCancel: 'Cancel',
    Send_ButtonContinue: 'Continue',
    Send_PlaceholderPIN: 'Enter your PIN',

    Send_Decrypting: 'Decryption running ...',
    Send_DecryptionFailed: 'Decryption failed - wrong PIN ?',
    Send_NotEnoughBalance: 'Your balance is too low.',
    Send_AmountTooLow: 'The amount is too low (lower than the transaction fee).',
    Send_TransactionFailed: 'Failed - not enough funds or amount too low.',
    
    Withdraw_Link: 'To withdraw your funds to "%s" ...',
    Withdraw_LinkButton: '... click here!',
    Withdraw_Withdrawn: 'Your funds have been withdrawn to "%s".',
    Withdraw_PageTitle: 'Withdraw funds to ',
    Withdraw_LabelPIN: 'PIN:',
    Withdraw_ButtonCancel: 'Cancel',
    Withdraw_ButtonContinue: 'Continue',
    Withdraw_PlaceholderPIN: 'Enter your PIN',

    Withdraw_Decrypting: 'Decryption running ...',
    Withdraw_DecryptionFailed: 'Decryption failed - wrong PIN ?',
    Withdraw_NotEnoughBalance: 'Your balance is too low.',
    Withdraw_TransactionFailed: 'Failed - not enough funds ?',

    Balance: 'Your balance is %s BTC (~ €%s).',
    
  };  

  
module.exports.get = function(lang) {
  
  var result = stringsEn;
  if (lang === module.exports.LANG_DE)
    result = stringsDe;
  
  result.lang = lang;
  
  result.format = function() {
    return util.format.apply(null, arguments);
  };
  
  return result;
};

module.exports.getLangFromLocale = function(locale) {
  if (locale && locale.startsWith('de'))
    return module.exports.LANG_DE;
  else
    return module.exports.LANG_EN;
};
module.exports.getLangFromWallet = function(wallet) {
  if (wallet && wallet.facebook_profile && wallet.facebook_profile.locale && wallet.facebook_profile.locale.startsWith('de'))
    return module.exports.LANG_DE;
  else
    return module.exports.LANG_EN;
};

module.exports.LANG_DE = 'de';
module.exports.LANG_EN = 'en';





