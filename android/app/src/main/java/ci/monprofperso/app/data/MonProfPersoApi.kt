package ci.monprofperso.app.data

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
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
}

object Api {
    val service: MonProfPersoApi by lazy {
        val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
        val client = OkHttpClient.Builder()
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
