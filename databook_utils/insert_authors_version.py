import csv
import subprocess


from docutils import nodes
from docutils.parsers.rst import Directive

# possible todo: replace this with ast.eval_literal
def setstring_to_set(setstring):
	setstring = setstring.replace(", ", ",")
	setlist = setstring.split(",")
	return set(setlist)


# possible todo: replace this with ast.eval_literal
def dictstring_to_dict(dictstring):
	dictstring = dictstring.replace(", ", ",")
	dictstring = dictstring.replace("-- ", "--")
	dictlist = dictstring.split(",")

	this_dict = {}
	for elem in dictlist:
		try:
			key, val = elem.split("--")
		except:
			raise ValueError("Aliases should be formatted in key value pairs, delimited by a colon")
		if key not in this_dict:
			this_dict[key] = val
	return this_dict


class Committers(Directive):

	optional_arguments = 3
	option_spec = {"blacklist": setstring_to_set, "aliases": dictstring_to_dict}

	@classmethod
	def get_comitters(self, blacklist, aliases, raw=False):
		log = subprocess.Popen(["git", "log"], stdout=subprocess.PIPE, text=True)
		shortlog = subprocess.check_output(["git", "shortlog", "-sn"], stdin=log.stdout, encoding="utf8")
		print(shortlog)
		contributions = shortlog.split("\n")[:-1]
		contributors = {contribution.split("\t")[1] : contribution.split("\t")[0].strip() for contribution in contributions}

		aliased_contributors = { aliases.get(name, name): commits for name, commits in contributors.items() }
		filtered_contributors = [(contributor, n_commits) for contributor, n_commits in aliased_contributors.items() if contributor not in blacklist]

		return filtered_contributors


	def run(self):
		blacklist= self.options.get("blacklist", set())
		aliases = self.options.get("aliases", {})

		committers = self.get_comitters(blacklist, aliases)
		authors = [contributor + " (" + str(n_commits) + ")" for contributor, n_commits in committers]	
		print("Authors:", authors)

		authors_text = ", ".join(authors)
		emphasis_node = nodes.Text(authors_text)
		return [emphasis_node]


class Authors(Directive):

	optional_arguments = 3
	option_spec = {"role": str, "blacklist": setstring_to_set, "aliases": dictstring_to_dict}

	def run(self):
		selected_role = self.options.get("role", "")
		blacklist= self.options.get("blacklist", set())
		aliases = self.options.get("aliases", {})

		# get authors with matching role from csv
		authors = set()
		with open("./data/contributors.csv") as f:
			table = list(csv.reader(f))
		role_idx = table[0].index("Role")
		name_idx = table[0].index("Name")
		for contributor in table[1:]:
			contributor_roles = contributor[role_idx].split(", ")
			# if there is no selected role, include all but "Funding" contributors, otherwise only include contributors with selected roles
			if (selected_role == "" and contributor_roles != ["Funding"]) or selected_role in contributor_roles:
				authors.add(contributor[name_idx])
		
		# if we need committers, add them to the set, replacing existing names that match committer names
		if selected_role == "" or selected_role == "Committers":
			committers = Committers.get_comitters(blacklist, aliases, raw=True)
			for committer_name, n_commits in committers:
				authors.add(committer_name)

		# sort based on last name alphabetically
		authors = sorted(list(authors), key=lambda name: name.title().split()[-1])
		emphasis_node = nodes.Text(", ".join(authors))
		return [emphasis_node]


class VersionNumber(Directive):

	optional_arguments = 1

	def run(self):
		try:
			latest_version = subprocess.check_output(["git", "describe", "--tags", "--abbrev=0"], encoding="utf8")
		except:
			raise EnvironmentError("There are no git tags from which to get the version number")

		if self.arguments:
			paragraph_node = nodes.paragraph()
			uri = self.arguments[0]
			reference_node = nodes.reference("version", f"{latest_version}", internal=False, refuri=uri)
			paragraph_node += reference_node
		else:
			paragraph_node = nodes.paragraph(text=f"{latest_version}")
		return [paragraph_node]


class AuthorsIndex(Directive):

	def run(self):
		with open("./data/contributors.csv") as f:
			table = list(csv.reader(f))

		section = nodes.section(ids=["contributorsblock"])
		section += nodes.title("","Contributors")
		for idx, properties in enumerate(table):
			if idx == 0:
				continue
			entry = nodes.section(ids=["contributorentry"])

			name = properties[0]
			entry.append(nodes.strong(text=name))

			line_block = nodes.line_block()				
			for property in properties[1:]:
				if property != "":
					line_block.append(nodes.line(text=property))
			line_block.append(nodes.line(text=""))

			entry.append(line_block)
			section.append(entry)

		return [section]


def setup(app):
	app.add_directive("committers", Committers)
	app.add_directive("version", VersionNumber)
	app.add_directive("authors", Authors)
	app.add_directive("authors_index", AuthorsIndex)

	return {
		'version': '0.1',
		'parallel_read_safe': True,
		'parallel_write_safe': True,
	}
