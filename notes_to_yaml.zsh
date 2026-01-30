#!/usr/bin/env zsh

awk '
BEGIN {
  have_date = 0
}

# Match date lines like (2026-01-17)
/^\([0-9]{4}-[0-9]{2}-[0-9]{2}\)/ {
  current_date = substr($0, 2, 10)
  have_date = 1
  next
}

# Ignore everything until a date is seen
!have_date {
  next
}

# Top-level technique bullet
/^\* / {
  technique = substr($0, 3)

  if (!(technique in seen)) {
    order[++count] = technique
    seen[technique] = 1
  }

  dates[technique SUBSEP current_date] = 1
  current_technique = technique
  next
}

# Indented step bullet
/^[[:space:]]+\* / {
  if (current_technique == "")
    next

  step = substr($0, index($0, "* ") + 2)
  steps[current_technique, ++step_count[current_technique]] = step
  next
}

END {
  for (i = 1; i <= count; i++) {
    tech = order[i]

    print "  - position: \"\""
    print "    technique: \"" tech "\""
    print "    steps:"

    for (j = 1; j <= step_count[tech]; j++) {
      print "      - \"" steps[tech, j] "\""
    }

    printf "    dates: ["
    sep = ""
    for (k in dates) {
      split(k, parts, SUBSEP)
      if (parts[1] == tech) {
        printf "%s\"%s\"", sep, parts[2]
        sep = ", "
      }
    }
    print "]"
  }
}
'
