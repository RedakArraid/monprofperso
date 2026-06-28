package ci.monprofperso.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.monprofperso.app.nav.NavActions
import ci.monprofperso.app.nav.Routes
import ci.monprofperso.app.ui.components.*
import ci.monprofperso.app.ui.components.Card
import ci.monprofperso.app.ui.theme.AkColors
import ci.monprofperso.app.ui.theme.Hanken
import ci.monprofperso.app.ui.theme.Schibsted

private data class Subject(val label: String, val icon: ImageVector, val green: Boolean)
private data class Teacher(
    val initials: String, val name: String, val subjects: String, val rating: String,
    val reviews: String, val place: String, val price: String, val green: Boolean = true,
)

private val subjects = listOf(
    Subject("Maths", Icons.Filled.Functions, true),
    Subject("Physique", Icons.Filled.Science, false),
    Subject("Français", Icons.Filled.MenuBook, true),
    Subject("Anglais", Icons.Filled.Translate, false),
    Subject("SVT", Icons.Filled.Spa, false),
    Subject("Philo", Icons.Filled.Psychology, true),
    Subject("Hist-Géo", Icons.Filled.Public, true),
    Subject("Plus", Icons.Filled.MoreHoriz, false),
)

/* ====================================================================== *
 * ÉCRAN 5, ACCUEIL
 * ====================================================================== */
@Composable
fun HomeScreen(nav: NavActions, vm: ci.monprofperso.app.data.HomeViewModel = androidx.lifecycle.viewmodel.compose.viewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()
    val data = (state as? ci.monprofperso.app.data.UiState.Success)?.data
    val subjectItems = data?.subjects?.map { it.toSubject() } ?: subjects
    val recoTeachers = data?.teachers ?: emptyList()
    AkScreen(applyBottomInset = false) {
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 8.dp)) {
            // top bar
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                InitialsAvatar("AK", size = 44, radius = 13, fontSize = 17)
                Spacer(Modifier.width(11.dp))
                Column(Modifier.weight(1f)) {
                    Text("Bonjour,", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted)
                    Text("Aya Koné", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = AkColors.Ink)
                }
                NotificationBell(nav)
            }
            // search
            Spacer(Modifier.height(16.dp))
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.White)
                    .border(1.dp, AkColors.Border, RoundedCornerShape(15.dp)).clickable { nav.go(Routes.SearchResults) }
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.Search, null, tint = AkColors.Faint, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(10.dp))
                Text("Rechercher une matière, un prof…", fontFamily = Hanken, fontSize = 14.5.sp, color = AkColors.Faint)
            }
            // promo banner
            Spacer(Modifier.height(16.dp))
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(AkColors.Green).padding(18.dp),
            ) {
                Pill("SESSION 2026", AkColors.Green, AkColors.OrangeLight)
                Spacer(Modifier.height(10.dp))
                Text("Prépa BEPC & BAC\nen petits groupes", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold,
                    fontSize = 19.sp, lineHeight = 22.sp, color = AkColors.White)
                Spacer(Modifier.height(13.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Découvrir", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.White,
                        modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(AkColors.Orange)
                            .clickable { nav.go(Routes.GroupCourses) }.padding(horizontal = 14.dp, vertical = 8.dp))
                    Spacer(Modifier.width(7.dp))
                    Text("dès 2 000 F / séance", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.OnGreenSoft)
                }
            }
            // matières
            Spacer(Modifier.height(20.dp))
            SectionHeader("Matières")
            Spacer(Modifier.height(13.dp))
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                subjectItems.chunked(4).forEach { row ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        row.forEach { s ->
                            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(7.dp)) {
                                Box(Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(16.dp))
                                    .background(if (s.green) AkColors.GreenSoft else AkColors.OrangeSoft)
                                    .clickable { nav.go(Routes.SearchResults) }, contentAlignment = Alignment.Center) {
                                    Icon(s.icon, null, tint = if (s.green) AkColors.Green else AkColors.Orange,
                                        modifier = Modifier.size(24.dp))
                                }
                                Text(s.label, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 11.5.sp, color = AkColors.InkSoft)
                            }
                        }
                    }
                }
            }
            // profs reco
            Spacer(Modifier.height(20.dp))
            SectionHeader("Profs recommandés", onAction = { nav.go(Routes.SearchResults) })
            Spacer(Modifier.height(13.dp))
            if (recoTeachers.isEmpty()) {
                RecoTeacher("KN", "Koffi N'Guessan", "Maths · Physique-Chimie", "4,9", "128 avis", "Cocody", "4 000 F", true) { nav.go(Routes.TeacherProfile) }
                Spacer(Modifier.height(11.dp))
                RecoTeacher("MT", "Mariam Touré", "Anglais · Espagnol", "5,0", "74 avis", "Plateau", "4 500 F", false) { nav.go(Routes.TeacherProfile) }
            } else {
                recoTeachers.take(2).forEachIndexed { i, t ->
                    if (i > 0) Spacer(Modifier.height(11.dp))
                    RecoTeacher(t.initials, t.name, t.subjects, t.ratingLabel, "${t.reviewsCount} avis", t.location, t.priceLabel, t.accent == "green") { nav.go(Routes.TeacherProfile) }
                }
            }
            Spacer(Modifier.height(16.dp))
        }
        BottomNav(NavTab.Accueil, nav::selectTab)
    }
}

@Composable
private fun RecoTeacher(
    initials: String, name: String, subjects: String, rating: String, reviews: String,
    place: String, price: String, green: Boolean, onClick: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(AkColors.White)
            .border(1.dp, AkColors.Border, RoundedCornerShape(18.dp)).clickable { onClick() }.padding(13.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        InitialsAvatar(initials, size = 54, bg = if (green) AkColors.GreenSoft else AkColors.OrangeSoft,
            fg = if (green) AkColors.Green else AkColors.Orange, verified = true)
        Spacer(Modifier.width(13.dp))
        Column(Modifier.weight(1f)) {
            Text(name, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = AkColors.Ink)
            Text(subjects, fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 1.dp))
            Spacer(Modifier.height(5.dp))
            RatingInline(rating, reviews, place)
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(price, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = AkColors.Green)
            Text("/ heure", fontFamily = Hanken, fontSize = 11.sp, color = AkColors.Faint)
        }
    }
}

/* ====================================================================== *
 * ÉCRAN 6, RÉSULTATS DE RECHERCHE
 * ====================================================================== */
/** Mappe une matière API vers le modèle d'affichage (avec icône Material). */
private fun ci.monprofperso.app.data.SubjectDto.toSubject(): Subject =
    Subject(name, subjectIcon(icon), accent == "green")

private fun subjectIcon(s: String): ImageVector = when (s) {
    "function" -> Icons.Filled.Functions
    "atom" -> Icons.Filled.Science
    "book" -> Icons.Filled.MenuBook
    "translate" -> Icons.Filled.Translate
    "leaf" -> Icons.Filled.Spa
    "brain" -> Icons.Filled.Psychology
    "globe" -> Icons.Filled.Public
    else -> Icons.Filled.MoreHoriz
}

/** Mappe un DTO API vers le modèle d'affichage de la carte. */
private fun ci.monprofperso.app.data.TeacherDto.toCard(): Teacher = Teacher(
    initials = initials,
    name = name,
    subjects = subjects,
    rating = ratingLabel,
    reviews = "$reviewsCount avis",
    place = distanceKm?.let { "%.1f km".format(it).replace('.', ',') } ?: location,
    price = priceLabel,
    green = accent == "green",
)

@Composable
fun SearchResultsScreen(nav: NavActions, vm: ci.monprofperso.app.data.TeachersViewModel = androidx.lifecycle.viewmodel.compose.viewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()
    AkScreen(applyTopInset = false, applyBottomInset = false) {
        // header (white)
        Column(Modifier.fillMaxWidth().background(AkColors.White).statusBarsPaddingCompat().padding(horizontal = 22.dp).padding(top = 10.dp, bottom = 12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconSquare(Icons.AutoMirrored.Filled.ArrowBack, onClick = { nav.back() })
                Spacer(Modifier.width(13.dp))
                Column(Modifier.weight(1f)) {
                    Text("Profs de Maths", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = AkColors.Ink)
                    val count = (state as? ci.monprofperso.app.data.UiState.Success)?.data?.size
                    Text(if (count != null) "$count profs · Cocody, Abidjan" else "Chargement…", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted)
                }
                IconSquare(Icons.Filled.Tune, bg = AkColors.Green, tint = AkColors.White, onClick = { nav.go(Routes.Filters) })
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Chip("À domicile", true, Icons.Filled.Home)
                Chip("En ligne", false, Icons.Filled.Videocam)
                Chip("3ᵉ (BEPC)", false)
                Chip("Prix", false)
            }
            // bandeau source des données (API en direct vs hors-ligne)
            (state as? ci.monprofperso.app.data.UiState.Success)?.let { s ->
                Spacer(Modifier.height(8.dp))
                Text(
                    if (s.fromApi) "● Données en direct (API Mon Prof Perso)" else "○ Mode hors-ligne (données locales)",
                    fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 11.sp,
                    color = if (s.fromApi) AkColors.Green else AkColors.Faint,
                )
            }
        }
        Box(Modifier.weight(1f)) {
            Column(Modifier.fillMaxSize().verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 14.dp)) {
                when (val s = state) {
                    is ci.monprofperso.app.data.UiState.Loading ->
                        Text("Chargement des professeurs…", fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 40.dp))
                    is ci.monprofperso.app.data.UiState.Error ->
                        Text(s.message, fontFamily = Hanken, fontSize = 13.sp, color = AkColors.Orange, modifier = Modifier.padding(top = 40.dp))
                    is ci.monprofperso.app.data.UiState.Success -> s.data.forEach { t ->
                        SearchTeacherCard(t.toCard()) { nav.go(Routes.TeacherProfile) }
                        Spacer(Modifier.height(12.dp))
                    }
                }
                Spacer(Modifier.height(60.dp))
            }
            Row(
                Modifier.align(Alignment.BottomCenter).padding(bottom = 24.dp)
                    .clip(RoundedCornerShape(13.dp)).background(AkColors.Ink).padding(horizontal = 18.dp, vertical = 11.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.Map, null, tint = AkColors.White, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(7.dp))
                Text("Voir sur la carte", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.White)
            }
        }
    }
}

@Composable
private fun SearchTeacherCard(t: Teacher, onClick: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(AkColors.White)
            .border(1.dp, AkColors.Border, RoundedCornerShape(20.dp)).clickable { onClick() }.padding(15.dp),
    ) {
        Row {
            InitialsAvatar(t.initials, size = 58, radius = 16, fontSize = 20, verified = true,
                bg = if (t.green) AkColors.GreenSoft else AkColors.OrangeSoft, fg = if (t.green) AkColors.Green else AkColors.Orange)
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(t.name, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 15.5.sp, color = AkColors.Ink)
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(t.price, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = AkColors.Green)
                        Text("/h", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, color = AkColors.Faint)
                    }
                }
                Text(t.subjects, fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 2.dp))
                Spacer(Modifier.height(7.dp))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    RatingInline(t.rating, t.reviews)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.LocationOn, null, tint = AkColors.Faint, modifier = Modifier.size(13.dp))
                        Text(t.place, fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Faint)
                    }
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            Tag("À domicile")
            if (t.green) Tag("En ligne")
            if (t.initials == "KN") Tag("Spécial BEPC", AkColors.Orange, AkColors.OrangeSoft)
        }
    }
}

/* ====================================================================== *
 * ÉCRAN 7, FILTRES
 * ====================================================================== */
@Composable
fun FiltersScreen(nav: NavActions) {
    var format by remember { mutableStateOf(setOf(0, 1)) }
    var niveau by remember { mutableIntStateOf(1) }
    var matiere by remember { mutableIntStateOf(0) }
    var distance by remember { mutableIntStateOf(0) }
    AkScreen {
        Row(Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            IconSquare(Icons.Filled.Close, onClick = { nav.back() })
            Spacer(Modifier.width(13.dp))
            Text("Filtres", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = AkColors.Ink, modifier = Modifier.weight(1f))
            Text("Réinitialiser", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Orange,
                modifier = Modifier.clickable { format = emptySet(); niveau = -1; matiere = -1; distance = -1 })
        }
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            FilterLabel("Format du cours")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Chip("À domicile", 0 in format, Icons.Filled.Home) { format = if (0 in format) format - 0 else format + 0 }
                Chip("En ligne", 1 in format, Icons.Filled.Videocam) { format = if (1 in format) format - 1 else format + 1 }
            }
            FilterLabel("Niveau scolaire", top = 20)
            SingleChips(listOf("Primaire", "Collège", "Lycée", "Supérieur"), niveau) { niveau = it }
            FilterLabel("Matière", top = 20)
            SingleChips(listOf("Mathématiques", "Physique-Chimie", "Français"), matiere) { matiere = it }
            Spacer(Modifier.height(20.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Tarif horaire", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
                Text("1 000 – 6 000 F", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.Green)
            }
            // slider
            Box(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 18.dp).height(6.dp).clip(RoundedCornerShape(3.dp)).background(Color(0xFFEAE5DC))) {
                Box(Modifier.fillMaxHeight().fillMaxWidth(0.7f).padding(start = 40.dp).background(AkColors.Green, RoundedCornerShape(3.dp)))
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Note minimale", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink)
                RatingInline("4,5 et plus")
            }
            FilterLabel("Distance", top = 20)
            SingleChips(listOf("Moins de 2 km", "5 km", "10 km"), distance) { distance = it }
            Spacer(Modifier.height(20.dp))
        }
        Box(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp).padding(top = 14.dp, bottom = 24.dp)) {
            PrimaryButton("Voir 36 professeurs", Modifier.fillMaxWidth(), trailingIcon = null, onClick = { nav.go(Routes.SearchResults) })
        }
    }
}

@Composable
private fun FilterLabel(text: String, top: Int = 0) {
    if (top > 0) Spacer(Modifier.height(top.dp))
    Text(text, fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = AkColors.Ink, modifier = Modifier.padding(bottom = 11.dp))
}

/** Rangée de chips à sélection unique. */
@Composable
private fun SingleChips(options: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
        options.forEachIndexed { i, label -> Chip(label, i == selected) { onSelect(i) } }
    }
}

/* ====================================================================== *
 * ÉCRAN 8, PROFIL DU PROFESSEUR
 * ====================================================================== */
@Composable
fun TeacherProfileScreen(nav: NavActions, vm: ci.monprofperso.app.data.TeacherProfileViewModel = androidx.lifecycle.viewmodel.compose.viewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()
    val t = (state as? ci.monprofperso.app.data.UiState.Success)?.data ?: ci.monprofperso.app.data.FallbackData.teacherDetail
    val levels = t.levels ?: listOf("Collège", "Lycée", "Prépa BEPC", "Prépa BAC")
    val review = t.reviews?.firstOrNull()
    AkScreen(applyTopInset = false, applyBottomInset = false) {
        // header banner green
        Column(Modifier.fillMaxWidth().background(AkColors.Green).statusBarsPaddingCompat().padding(horizontal = 22.dp).padding(top = 6.dp, bottom = 22.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                IconSquare(Icons.AutoMirrored.Filled.ArrowBack, bg = AkColors.White.copy(alpha = 0.14f), tint = AkColors.White, onClick = { nav.back() })
                IconSquare(Icons.Outlined.FavoriteBorder, bg = AkColors.White.copy(alpha = 0.14f), tint = AkColors.White)
            }
            Spacer(Modifier.height(14.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                InitialsAvatar(t.initials, size = 76, radius = 22, fontSize = 27, bg = AkColors.OrangeLight, fg = AkColors.Green, verified = true)
                Spacer(Modifier.width(15.dp))
                Column {
                    Text(t.name, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = AkColors.White)
                    Text(t.subjects, fontFamily = Hanken, fontSize = 13.5.sp, color = AkColors.OnGreenSoft, modifier = Modifier.padding(top = 2.dp))
                    Spacer(Modifier.height(7.dp))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(Modifier.clip(RoundedCornerShape(8.dp)).background(AkColors.White.copy(alpha = 0.15f)).padding(horizontal = 9.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Star, null, tint = AkColors.Star, modifier = Modifier.size(13.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("${t.ratingLabel} · ${t.reviewsCount} avis", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.5.sp, color = AkColors.White)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.LocationOn, null, tint = AkColors.OnGreenSoft, modifier = Modifier.size(13.dp))
                            Text(t.location, fontFamily = Hanken, fontSize = 12.sp, color = AkColors.OnGreenSoft)
                        }
                    }
                }
            }
        }
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile(t.experience ?: "8 ans", "expérience", Modifier.weight(1f))
                StatTile(t.students ?: "340+", "élèves suivis", Modifier.weight(1f))
                StatTile(t.bacSuccess ?: "94%", "réussite BAC", Modifier.weight(1f))
            }
            Spacer(Modifier.height(18.dp))
            Text("À propos", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = AkColors.Ink)
            Text(t.bio ?: "Professeur certifié, ancien du Lycée Classique d'Abidjan. J'accompagne les élèves de la 3ᵉ à la Terminale avec une méthode claire et beaucoup d'exercices types examen.",
                fontFamily = Hanken, fontSize = 13.5.sp, lineHeight = 21.sp, color = Color(0xFF4A574F), modifier = Modifier.padding(top = 8.dp))
            Spacer(Modifier.height(14.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                levels.forEach { NeutralTag(it) }
            }
            if (!t.programs.isNullOrEmpty()) {
                Spacer(Modifier.height(10.dp))
                Text("Programmes", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = AkColors.Muted)
                Spacer(Modifier.height(7.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                    t.programs.forEach { NeutralTag(programLabel(it)) }
                }
            }
            if (t.negotiable) {
                Spacer(Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(AkColors.OrangeSoft).padding(horizontal = 12.dp, vertical = 8.dp)) {
                    Icon(Icons.Filled.Handshake, null, tint = AkColors.Orange, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Tarif & fréquence à négocier", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 12.5.sp, color = AkColors.Orange)
                }
            }
            Spacer(Modifier.height(18.dp))
            SectionHeader("Avis des parents")
            Spacer(Modifier.height(11.dp))
            Card(radius = 16, padding = 14) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    InitialsAvatar(review?.authorInitials ?: "FB", size = 36, radius = 11, fontSize = 13, bg = AkColors.OrangeSoft, fg = AkColors.Orange)
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(review?.authorName ?: "Fatou B.", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = AkColors.Ink)
                        Text(review?.timeAgo ?: "il y a 2 semaines", fontFamily = Hanken, fontSize = 11.sp, color = AkColors.Faint)
                    }
                    Row { repeat(5) { Icon(Icons.Filled.Star, null, tint = AkColors.Star, modifier = Modifier.size(13.dp)) } }
                }
                Text(review?.text ?: "Ma fille est passée de 9 à 14 en maths en un trimestre. Très pédagogue et toujours ponctuel. Je recommande vivement !",
                    fontFamily = Hanken, fontSize = 13.sp, lineHeight = 20.sp, color = Color(0xFF4A574F), modifier = Modifier.padding(top = 9.dp))
            }
            Spacer(Modifier.height(16.dp))
        }
        // sticky CTA
        Column(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp).padding(top = 12.dp, bottom = 24.dp)) {
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(13.dp)).background(AkColors.GreenSoft)
                    .clickable { nav.go(Routes.SubscriptionPlans) }.padding(horizontal = 13.dp, vertical = 11.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.WorkspacePremium, null, tint = AkColors.Green, modifier = Modifier.size(19.dp))
                Spacer(Modifier.width(10.dp))
                Text("Suivi régulier ? Abonnez-vous dès 14 000 F/mois", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Ink, modifier = Modifier.weight(1f))
                Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = AkColors.Green, modifier = Modifier.size(15.dp))
            }
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(t.priceLabel, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 21.sp, color = AkColors.Ink)
                        Text("/h", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = AkColors.Faint)
                    }
                    Text(if (t.negotiable) "Tarif à négocier" else "1ᵉʳ cours d'essai -50%", fontFamily = Hanken, fontSize = 11.5.sp, color = AkColors.Muted)
                }
                Spacer(Modifier.width(14.dp))
                PrimaryButton("Réserver un cours", Modifier.weight(1f), onClick = { ci.monprofperso.app.data.AppState.startBooking(t); nav.go(Routes.Booking) })
            }
        }
    }
}

@Composable
private fun StatTile(value: String, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier.clip(RoundedCornerShape(16.dp)).background(AkColors.White).border(1.dp, AkColors.Border, RoundedCornerShape(16.dp))
            .padding(vertical = 13.dp), horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(value, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 19.sp, color = AkColors.Green)
        Text(label, fontFamily = Hanken, fontSize = 11.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 2.dp))
    }
}

fun programLabel(slug: String): String = when (slug) {
    "standard" -> "Programme standard"
    "francais" -> "Programme français"
    else -> slug.replaceFirstChar { it.uppercase() }
}

@Composable
fun NeutralTag(label: String) {
    Text(label, fontFamily = Hanken, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = AkColors.InkSoft,
        modifier = Modifier.clip(RoundedCornerShape(9.dp)).background(AkColors.CardField).padding(horizontal = 12.dp, vertical = 7.dp))
}
