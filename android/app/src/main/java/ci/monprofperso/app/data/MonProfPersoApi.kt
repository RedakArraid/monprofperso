package ci.monprofperso.app.data

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

/** Configuration de l'URL de base de l'API commune. */
object ApiConfig {
    // Émulateur Android : 10.0.2.2 = localhost de la machine hôte.
    // Appareil physique : remplacer par l'IP LAN du Mac (ex. http://192.168.1.20:8099).
    const val BASE_URL = "http://10.0.2.2:8099/"
}

interface MonProfPersoApi {
    @GET("api/subjects")
    suspend fun subjects(): List<SubjectDto>

    @GET("api/levels")
    suspend fun levels(): List<LevelDto>

    // --- Espace admin (rôle admin requis ; le token Bearer est ajouté par l'intercepteur) ---
    @POST("api/admin/subjects")
    suspend fun createSubject(@Body body: Map<String, String>): SubjectDto

    @DELETE("api/admin/subjects/{slug}")
    suspend fun deleteSubject(@Path("slug") slug: String): Response<Unit>

    @POST("api/admin/levels")
    suspend fun createLevel(@Body body: Map<String, @JvmSuppressWildcards Any?>): LevelDto

    @DELETE("api/admin/levels/{slug}")
    suspend fun deleteLevel(@Path("slug") slug: String): Response<Unit>

    @GET("api/resources")
    suspend fun resources(
        @Query("type") type: String? = null,
        @Query("subject") subject: String? = null,
        @Query("level") level: String? = null,
    ): List<ResourceDto>

    @POST("api/admin/resources")
    suspend fun createResource(@Body body: Map<String, @JvmSuppressWildcards Any?>): ResourceDto

    @DELETE("api/admin/resources/{id}")
    suspend fun deleteResource(@Path("id") id: Int): Response<Unit>

    @GET("api/teachers")
    suspend fun teachers(
        @Query("format") format: String? = null,
        @Query("level") level: String? = null,
    ): List<TeacherDto>

    @GET("api/teachers/{id}")
    suspend fun teacher(@Path("id") id: Int): TeacherDto

    @GET("api/courses")
    suspend fun courses(@Query("status") status: String? = null): List<CourseDto>

    @POST("api/bookings")
    suspend fun book(@Body body: Map<String, @JvmSuppressWildcards Any?>): Map<String, Any?>

    @GET("api/notifications")
    suspend fun notifications(): List<NotificationDto>

    @GET("api/progress")
    suspend fun progress(): ProgressDto

    @GET("api/groups")
    suspend fun groups(): List<GroupDto>

    @GET("api/subscription/plans")
    suspend fun plans(): List<PlanDto>

    @POST("api/auth/login")
    suspend fun login(@Body body: Map<String, String>): AuthResponse

    @POST("api/auth/signup")
    suspend fun signup(@Body body: Map<String, String>): AuthResponse

    @POST("api/auth/verify-otp")
    suspend fun verifyOtp(@Body body: Map<String, String>): VerifyResponse
}

object Api {
    val service: MonProfPersoApi by lazy {
        val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
        val auth = okhttp3.Interceptor { chain ->
            val token = TokenStore.token
            val req = if (token != null)
                chain.request().newBuilder().addHeader("Authorization", "Bearer $token").build()
            else chain.request()
            chain.proceed(req)
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(auth)
            .addInterceptor(logging)
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()
        Retrofit.Builder()
            .baseUrl(ApiConfig.BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(MonProfPersoApi::class.java)
    }
}
