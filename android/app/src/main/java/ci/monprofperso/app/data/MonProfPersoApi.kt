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
    // Production VPS (Traefik + Let's Encrypt).
    const val BASE_URL = "https://api.monprofperso.com/"
    // Dev local émulateur : "http://10.0.2.2:8099/"
}

interface MonProfPersoApi {
    @GET("api/subjects")
    suspend fun subjects(): List<SubjectDto>

    @GET("api/levels")
    suspend fun levels(): List<LevelDto>

    @GET("api/programs")
    suspend fun programs(): List<ProgramDto>

    @POST("api/admin/programs")
    suspend fun createProgram(@Body body: Map<String, @JvmSuppressWildcards Any?>): ProgramDto

    @DELETE("api/admin/programs/{slug}")
    suspend fun deleteProgram(@Path("slug") slug: String): Response<Unit>

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

    // --- Paramètres plateforme (réseaux sociaux + contact) ---
    @GET("api/settings")
    suspend fun settings(): Map<String, String>

    @retrofit2.http.PUT("api/admin/settings")
    suspend fun updateSettings(@Body body: Map<String, String>): Map<String, String>

    // --- Documents légaux ---
    @GET("api/legal")
    suspend fun legalDocs(): List<LegalDocDto>

    @retrofit2.http.PUT("api/admin/legal/{slug}")
    suspend fun uploadLegalDoc(@Path("slug") slug: String, @Body body: Map<String, @JvmSuppressWildcards Any?>): LegalDocDto

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

    @GET("api/notifications/unread")
    suspend fun unreadCount(): UnreadDto

    @POST("api/notifications/read")
    suspend fun markNotificationsRead(): Response<Unit>

    @GET("api/progress")
    suspend fun progress(): ProgressDto

    @GET("api/groups")
    suspend fun groups(): List<GroupDto>

    @GET("api/subscription/plans")
    suspend fun plans(): List<PlanDto>

    // --- Espace professeur ---
    @GET("api/teacher/dashboard")
    suspend fun teacherDashboard(): TeacherDashboardDto

    @GET("api/teacher/requests")
    suspend fun teacherRequests(): List<TeacherRequestDto>

    @GET("api/teacher/earnings")
    suspend fun teacherEarnings(): TeacherEarningsDto

    @POST("api/teacher/requests/{id}/accept")
    suspend fun acceptRequest(@Path("id") id: Int): Response<Unit>

    @POST("api/teacher/requests/{id}/refuse")
    suspend fun refuseRequest(@Path("id") id: Int): Response<Unit>

    // Contre-proposition du prof (tarif et/ou fréquence).
    @POST("api/teacher/requests/{id}/counter")
    suspend fun counterRequest(@Path("id") id: Int, @Body body: Map<String, @JvmSuppressWildcards Any?>): Response<Unit>

    // Le prof active/désactive « à négocier » sur ses offres.
    @POST("api/teacher/negotiable")
    suspend fun setNegotiable(@Body body: Map<String, Boolean>): Map<String, Any?>

    // Le client accepte / refuse la contre-proposition du prof.
    @POST("api/courses/{id}/negotiation/accept")
    suspend fun acceptNegotiation(@Path("id") id: Int): Response<Unit>

    @POST("api/courses/{id}/negotiation/refuse")
    suspend fun refuseNegotiation(@Path("id") id: Int): Response<Unit>

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
