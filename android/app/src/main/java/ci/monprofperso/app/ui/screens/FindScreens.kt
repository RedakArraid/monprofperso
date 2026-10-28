@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

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
import androidx.compose.ui.semantics.Role
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
    val subjectItems = data?.subjects?.map { it.toSubject() } ?: emptyList()
    val recoTeachers = data?.teachers ?: emptyList()
    AkScreen(applyBottomInset = false) {
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 8.dp)) {
            // top bar
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                InitialsAvatar(ci.monprofperso.app.data.AppState.authFullName.split(" ").filter { it.isNotBlank() }.take(2).joinToString("") { it.take(1) }, size = 44, radius = 13, fontSize = 17)
                Spacer(Modifier.width(11.dp))
                Column(Modifier.weight(1f)) {
                    Text("Bonjour,", fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted)
                    Text(ci.monprofperso.app.data.AppState.authFullName.ifBlank { "Mon compte" }, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = AkColors.Ink)
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
                Text("Rechercher une matière, un prof…", fontFamily = Hanken, fontSize = 15.sp, color = AkColors.Muted, modifier = Modifier.weight(1f))
            }
            // besoin parent
            Spacer(Modifier.height(12.dp))
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(AkColors.OrangeSoft)
                    .clickable { nav.go(Routes.ExpressNeed) }.padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text("Exprimer un besoin", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.Ink)
                    Text("On clarifie le besoin, on fixe un tarif, un prof accepte", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                }
                Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = AkColors.Orange, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.height(16.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(AkColors.Green).padding(18.dp)) {
                Text("Un accompagnement adapté à votre enfant", fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold,
                    fontSize = 19.sp, color = AkColors.White)
                Text("Choisissez un professeur, convenez d’un créneau et suivez chaque cours depuis votre espace.",
                    fontFamily = Hanken, color = AkColors.OnGreenSoft, modifier = Modifier.padding(top = 10.dp))
            }
            // matières
            Spacer(Modifier.height(20.dp))
            SectionHeader("Matières", onAction = { nav.go(Routes.SearchResults) })
            Spacer(Modifier.height(13.dp))
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                subjectItems.chunked(4).forEach { row ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        row.forEach { s ->
                            Column(Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).clickable(role = Role.Button) { nav.go(Routes.SearchResults) },
                                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(7.dp)) {
                                Box(Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(16.dp))
                                    .background(if (s.green) AkColors.GreenSoft else AkColors.OrangeSoft), contentAlignment = Alignment.Center) {
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
            if (state is ci.monprofperso.app.data.UiState.Loading) LoadingRow()
            if (state is ci.monprofperso.app.data.UiState.Error) OfflineBanner(onRetry = { vm.load() })
            if (data != null && recoTeachers.isEmpty()) Text("Aucun professeur disponible.", fontFamily = Hanken, color = AkColors.Muted)
            recoTeachers.take(2).forEachIndexed { i, t ->
                if (i > 0) Spacer(Modifier.height(11.dp))
                RecoTeacher(t.initials, t.name, t.subjects, t.ratingLabel, "${t.reviewsCount} avis", t.location, t.priceLabel, t.accent == "green", t.verified) { nav.openTeacher(t.id) }
            }
            Spacer(Modifier.height(16.dp))
        }
        BottomNav(NavTab.Accueil, nav::selectTab)
    }
}

@Composable
private fun RecoTeacher(
    initials: String, name: String, subjects: String, rating: String, reviews: String,
    place: String, price: String, green: Boolean, verified: Boolean, onClick: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(AkColors.White)
            .border(1.dp, AkColors.Border, RoundedCornerShape(18.dp)).clickable(role = Role.Button) { onClick() }.padding(13.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        InitialsAvatar(initials, size = 54, bg = if (green) AkColors.GreenSoft else AkColors.OrangeSoft,
            fg = if (green) AkColors.Green else AkColors.Orange, verified = verified)
        Spacer(Modifier.width(13.dp))
        Column(Modifier.weight(1f)) {
            Text(name, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = AkColors.Ink)
            Text(subjects, fontFamily = Hanken, fontSize = 12.5.sp, color = AkColors.Muted, modifier = Modifier.padding(top = 1.dp))
            Spacer(Modifier.height(5.dp))
            Text("$rating · $reviews", fontFamily = Hanken, fontSize = 12.sp, color = AkColors.InkSoft)
            Text(place, fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
            Text("$price / heure", fontFamily = Schibsted, fontWeight = FontWeight.Bold, fontSize = 15.sp,
                color = AkColors.Green, modifier = Modifier.padding(top = 7.dp))
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
                IconSquare(Icons.Filled.Tune, bg = AkColors.Green, tint = AkColors.White, contentDescription = "Filtrer les professeurs", onClick = { nav.go(Routes.Filters) })
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
                        Text(s.message, fontFamily = Hanken, fontSize = 13.sp, color = AkColors.OrangeStrong, modifier = Modifier.padding(top = 40.dp))
                    is ci.monprofperso.app.data.UiState.Success -> s.data.forEach { t ->
                        SearchTeacherCard(t.toCard()) { nav.openTeacher(t.id) }
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
            Text("Réinitialiser", fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = AkColors.OrangeStrong,
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
    val teacherId = ci.monprofperso.app.data.AppState.selectedTeacherId
    androidx.compose.runtime.LaunchedEffect(teacherId) { vm.load(teacherId) }
    val result = state as? ci.monprofperso.app.data.UiState.Success
    val t = result?.data
    if (t == null) {
        AkScreen {
            TopBar("Professeur", onBack = { nav.back() })
            if (state is ci.monprofperso.app.data.UiState.Loading) LoadingRow()
            else OfflineBanner(onRetry = { vm.load(teacherId) })
        }
        return
    }
    AkScreen {
        TopBar("Profil du professeur", onBack = { nav.back() })
        Column(Modifier.weight(1f).verticalScrollSafe().padding(horizontal = 22.dp).padding(top = 12.dp, bottom = 22.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(AkColors.Green).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    InitialsAvatar(t.initials, size = 68, radius = 20, fontSize = 25, bg = AkColors.OrangeLight, fg = AkColors.Green, verified = t.verified)
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text(t.name, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 23.sp, color = AkColors.White)
                        Text(t.subjects, fontFamily = Hanken, fontSize = 15.sp, color = AkColors.OnGreenSoft, modifier = Modifier.padding(top = 4.dp))
                    }
                }
                Text(t.location, fontFamily = Hanken, fontSize = 14.sp, color = AkColors.OnGreenSoft)
                Text("${t.ratingLabel}" + if (t.reviewsCount > 0) " · ${t.reviewsCount} avis" else "",
                    fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AkColors.White)
                if (t.verified) Text("Profil vérifié", fontFamily = Hanken, fontWeight = FontWeight.SemiBold, color = AkColors.OnGreenSoft)
            }
            val facts = listOfNotNull(
                t.experience?.takeIf { it.isNotBlank() && it != "—" }?.let { "Expérience" to it },
                t.students?.takeIf { it.isNotBlank() && it != "—" }?.let { "Accompagnement" to it },
                t.bacSuccess?.takeIf { it.isNotBlank() && it != "—" }?.let { "Réussite au BAC" to it },
            )
            if (facts.isNotEmpty()) Card(padding = 16) {
                facts.forEachIndexed { index, (label, value) ->
                    if (index > 0) Spacer(Modifier.height(12.dp))
                    Text(label, fontFamily = Hanken, fontSize = 12.sp, color = AkColors.Muted)
                    Text(value, fontFamily = Hanken, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = AkColors.Ink)
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                SectionHeader("À propos", action = null)
                Text(t.bio?.takeIf { it.isNotBlank() } ?: "Présentation à venir.",
                    fontFamily = Hanken, fontSize = 15.sp, lineHeight = 23.sp, color = AkColors.InkSoft)
            }
            if (!t.levels.isNullOrEmpty()) {
                SectionHeader("Niveaux accompagnés", action = null)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    t.levels.forEach { NeutralTag(it) }
                }
            }
            if (!t.programs.isNullOrEmpty()) {
                SectionHeader("Programmes", action = null)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    t.programs.forEach { NeutralTag(programLabel(it)) }
                }
            }
            if (t.negotiable) Tag("Tarif et fréquence à convenir", fg = AkColors.OrangeStrong, bg = AkColors.OrangeSoft)
            SectionHeader("Avis des parents", action = null)
            if (t.reviews.isNullOrEmpty()) Text("Aucun avis pour le moment.", fontFamily = Hanken, color = AkColors.Muted)
            t.reviews.orEmpty().forEach { review ->
                Card(radius = 16, padding = 16) {
                    Text(review.authorName, fontFamily = Hanken, fontWeight = FontWeight.Bold, color = AkColors.Ink)
                    Text("${review.rating}/5 · ${review.timeAgo}", fontFamily = Hanken, color = AkColors.Muted)
                    Spacer(Modifier.height(8.dp))
                    Text(review.text, fontFamily = Hanken, fontSize = 14.sp, lineHeight = 21.sp, color = AkColors.Ink)
                }
            }
        }
        Column(Modifier.fillMaxWidth().background(AkColors.White).padding(horizontal = 22.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("Tarif par heure", fontFamily = Hanken, fontSize = 14.sp, color = AkColors.Muted, modifier = Modifier.weight(1f))
                Text(t.priceLabel, fontFamily = Schibsted, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = AkColors.Green,
                    modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.End)
            }
            PrimaryButton("Réserver un cours", Modifier.fillMaxWidth(), enabled = result?.fromApi == true, onClick = {
                ci.monprofperso.app.data.AppState.startBooking(t); nav.go(Routes.Booking)
            })
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
