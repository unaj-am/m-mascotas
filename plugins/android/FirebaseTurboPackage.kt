package com.app.mascotas

import com.facebook.react.BaseReactPackage
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

// RN 0.88 no longer enumerates plain ReactPackage implementations by default.
// RN Firebase 27.1 exposes TurboModules through that older package interface.
internal class FirebaseTurboPackage(
  private val delegate: ReactPackage,
  private val names: List<String>,
) : BaseReactPackage() {
  private var context: ReactApplicationContext? = null
  private var modules: Map<String, NativeModule> = emptyMap()

  @Synchronized
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    if (name !in names) return null
    if (context !== reactContext) {
      @Suppress("DEPRECATION")
      modules = delegate.createNativeModules(reactContext).associateBy { it.name }
      context = reactContext
    }
    return modules[name]
  }

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    names.associateWith { name -> ReactModuleInfo(name, name, false, false, false, true) }
  }

  companion object {
    fun wrap(delegate: ReactPackage): ReactPackage {
      val names = when (delegate.javaClass.name) {
        "io.invertase.firebase.app.ReactNativeFirebaseAppPackage" ->
          listOf("NativeRNFBTurboApp", "NativeRNFBTurboUtils")
        "io.invertase.firebase.auth.ReactNativeFirebaseAuthPackage" ->
          listOf("NativeRNFBTurboAuth")
        "io.invertase.firebase.firestore.ReactNativeFirebaseFirestorePackage" ->
          listOf("NativeRNFBTurboFirestore", "NativeRNFBTurboFirestoreCollection",
            "NativeRNFBTurboFirestoreDocument", "NativeRNFBTurboFirestoreTransaction")
        else -> return delegate
      }
      return FirebaseTurboPackage(delegate, names)
    }
  }
}
