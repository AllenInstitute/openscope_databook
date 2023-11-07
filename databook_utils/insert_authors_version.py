import os
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
	dictstring = dictstring.replace(": ", ":")
	dictlist = dictstring.split(",")

	this_dict = {}
	for elem in dictlist:
		try:
			key, val = elem.split(":")
		except:
			raise ValueError("Aliases should be formatted in key value pairs, delimited by a colon")
		if key not in this_dict:
			this_dict[key] = val
	return this_dict


class AuthorsList(Directive):

	optional_arguments = 3
	option_spec = {"blacklist": setstring_to_set, "additional_authors": setstring_to_set, "aliases": dictstring_to_dict}


	def getContributors():
		log = subprocess.Popen(["git", "log"], stdout=subprocess.PIPE, text=True)
		shortlog = subprocess.check_output(["git", "shortlog", "-sn"], stdin=log.stdout, encoding="utf8")
		print(shortlog)
		contributions = shortlog.split("\n")[:-1]
		contributors = {contribution.split("\t")[1] : contribution.split("\t")[0].strip() for contribution in contributions}
		return contributors


	def run(self):
		
		blacklist, additional_authors, aliases = self.options["blacklist"], self.options["additional_authors"], self.options["aliases"]

		contributors = self.getContributors()
		aliased_contributors = { aliases.get(name, name): commits for name, commits in contributors.items() }
		authors = [contributor + " (" + str(n) + ")" for contributor, n in aliased_contributors.items() if contributor not in blacklist]
		authors += additional_authors
		print("Authors:", authors)

		authors_text = ", ".join(authors)
		emphasis_node = nodes.emphasis(text=authors_text)
		return [emphasis_node]


class VersionNumber(Directive):

	optional_arguments = 1

	def run(self):
		latest_version = subprocess.check_output(["git", "describe", "--tags", "--abbrev=0"], encoding="utf8")

		if self.arguments:
			paragraph_node = nodes.paragraph()
			uri = self.arguments[0]
			reference_node = nodes.reference("version", f"{latest_version}", internal=False, refuri=uri)
			paragraph_node += reference_node
		else:
			paragraph_node = nodes.paragraph(text=f"v{latest_version}")
		return [paragraph_node]


def setup(app):
	app.add_directive("authors", AuthorsList)
	app.add_directive("version", VersionNumber)

	return {
		'version': '0.1',
		'parallel_read_safe': True,
		'parallel_write_safe': True,
	}