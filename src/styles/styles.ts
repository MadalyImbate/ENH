import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  loginRoot: {
    flex: 1,
    backgroundColor: '#f2f5fa',
  },
  loginKeyboardContainer: {
    flex: 1,
  },
  loginScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  loginFrame: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  loginCard: {
    width: '100%',
    minHeight: 620,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  loginLogo: {
    width: '100%',
    height: 98,
    marginBottom: 12,
  },
  loginTitle: {
    fontSize: 30,
    fontFamily: 'Manrope_800ExtraBold',
    textAlign: 'center',
  },
  loginSubtitle: {
    marginTop: 6,
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 8,
    fontFamily: 'Manrope_600SemiBold',
  },
  loginButton: {
    marginTop: 6,
    borderRadius: 13,
    alignItems: 'center',
    paddingVertical: 14,
  },
  loginButtonText: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
  },
  guestButton: {
    marginTop: 16,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 13,
  },
  guestButtonText: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
  },
  guestInfoText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  otpNoticeBox: {
    marginBottom: 14,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  otpNoticeText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
  },
  otpDemoHintText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 6,
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 20,
  },
  loginTextAction: {
    marginTop: 14,
    alignSelf: 'center',
    paddingVertical: 4,
  },
  loginTextActionText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    textDecorationLine: 'underline',
  },
  bottomControlsWrap: {
    marginTop: 24,
    marginBottom: 28,
  },
  supportLinkWrap: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  supportLinkText: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    textDecorationLine: 'underline',
  },
  languageSliderWrap: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    flexDirection: 'row',
    position: 'relative',
  },
  languageSliderThumb: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '50%',
    borderRadius: 8,
  },
  languageSliderThumbLeft: {
    left: 4,
  },
  languageSliderThumbRight: {
    left: '50%',
  },
  languageOption: {
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    zIndex: 2,
  },
  languageOptionText: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
  },
  languageOptionTextActive: {
    fontFamily: 'Manrope_800ExtraBold',
  },
  homeRoot: {
    flex: 1,
    backgroundColor: '#0f1d3a',
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  screenTitle: {
    fontSize: 26,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#f3f7ff',
    textAlign: 'center',
  },
  screenDescription: {
    marginTop: 12,
    color: '#aab6cb',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Manrope_500Medium',
  },
});
